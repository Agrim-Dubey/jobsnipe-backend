import { api } from '../api.js';

const EXCHANGE_RATE_KEY = 'jobsnipe:usdInrRate';
export const FALLBACK_USD_TO_INR_RATE = 83.5;

const savedState = readSavedRate();

let exchangeRateState = {
  rate: savedState?.rate || FALLBACK_USD_TO_INR_RATE,
  live: Boolean(savedState?.live),
  asOf: savedState?.asOf || null,
  updatedAt: savedState?.updatedAt || null,
};

let ratePromise = null;
const subscribers = new Set();

function readSavedRate() {
  try {
    const raw = localStorage.getItem(EXCHANGE_RATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveRate(state) {
  try {
    localStorage.setItem(EXCHANGE_RATE_KEY, JSON.stringify(state));
  } catch (error) {
    // Ignore storage failures.
  }
}

function notifySubscribers() {
  subscribers.forEach((listener) => {
    try {
      listener({ ...exchangeRateState });
    } catch (error) {
      // Ignore UI subscriber failures.
    }
  });
}

function parseNumber(value) {
  if (value == null || value === '') return null;
  const numeric = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(numeric) ? numeric : null;
}

export function getUsdToInrRate() {
  return exchangeRateState.rate;
}

export function subscribeToExchangeRate(listener) {
  if (typeof listener !== 'function') return () => {};
  subscribers.add(listener);
  listener({ ...exchangeRateState });
  return () => subscribers.delete(listener);
}

export async function ensureExchangeRate(force = false) {
  if (ratePromise && !force) return ratePromise;

  ratePromise = api.getExchangeRate()
    .then((payload) => {
      const rate = Number(payload?.rate);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error('Invalid exchange rate');
      }
      exchangeRateState = {
        rate,
        live: Boolean(payload.live),
        asOf: payload.as_of || null,
        updatedAt: payload.updated_at || null,
      };
      saveRate(exchangeRateState);
      notifySubscribers();
      return exchangeRateState;
    })
    .catch(() => exchangeRateState)
    .finally(() => {
      ratePromise = null;
    });

  return ratePromise;
}

export function usdToInr(value) {
  const numeric = parseNumber(value);
  return numeric == null ? null : Math.round(numeric * getUsdToInrRate());
}

export function inrToUsd(value) {
  const numeric = parseNumber(value);
  return numeric == null ? null : Math.round(numeric / getUsdToInrRate());
}

export function bindCurrencyInputs(usdInput, inrInput) {
  if (!usdInput || !inrInput) return () => {};

  let syncing = false;

  const updateFromUsd = () => {
    if (syncing) return;
    syncing = true;
    const usdValue = parseNumber(usdInput.value);
    inrInput.value = usdValue == null ? '' : String(usdToInr(usdValue));
    syncing = false;
  };

  const updateFromInr = () => {
    if (syncing) return;
    syncing = true;
    const inrValue = parseNumber(inrInput.value);
    usdInput.value = inrValue == null ? '' : String(inrToUsd(inrValue));
    syncing = false;
  };

  usdInput.addEventListener('input', updateFromUsd);
  inrInput.addEventListener('input', updateFromInr);

  const unsubscribe = subscribeToExchangeRate(() => {
    if (document.activeElement === usdInput || (usdInput.value && !inrInput.value)) {
      updateFromUsd();
      return;
    }
    if (document.activeElement === inrInput || (inrInput.value && !usdInput.value)) {
      updateFromInr();
      return;
    }
    if (usdInput.value) updateFromUsd();
    else if (inrInput.value) updateFromInr();
  });

  ensureExchangeRate();

  if (usdInput.value && !inrInput.value) updateFromUsd();
  else if (inrInput.value && !usdInput.value) updateFromInr();

  return unsubscribe;
}

export function bindExchangeRateNote(noteEl) {
  if (!noteEl) return () => {};

  const unsubscribe = subscribeToExchangeRate((state) => {
    const rateLabel = Math.round(state.rate);
    if (state.live) {
      noteEl.textContent = state.asOf
        ? `Live salary conversion uses 1 USD ~= ${rateLabel} INR (market date ${state.asOf}).`
        : `Live salary conversion uses 1 USD ~= ${rateLabel} INR.`;
      return;
    }

    noteEl.textContent = `Live exchange rate is unavailable right now, using fallback 1 USD ~= ${rateLabel} INR.`;
  });

  ensureExchangeRate();
  return unsubscribe;
}

export function formatCurrency(value, currency) {
  if (value == null || !Number.isFinite(value)) return null;
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function extractSalaryBounds(text) {
  if (!text) return null;
  const cleaned = text.replace(/,/g, '');
  const numbers = Array.from(cleaned.matchAll(/(\d+(?:\.\d+)?)\s*(k)?/gi))
    .map((match) => {
      let value = Number(match[1]);
      if (match[2]) value *= 1000;
      return Math.round(value);
    })
    .filter((value) => Number.isFinite(value) && value > 0);

  if (numbers.length === 0) return null;
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
  };
}

function detectCurrency(text) {
  if (!text) return null;
  if (/₹|inr|rs\.?/i.test(text)) return 'INR';
  if (/\$|usd/i.test(text)) return 'USD';
  return null;
}

function formatRange(bounds, currency) {
  if (!bounds) return null;
  if (bounds.min === bounds.max) {
    return formatCurrency(bounds.min, currency);
  }
  return `${formatCurrency(bounds.min, currency)} - ${formatCurrency(bounds.max, currency)}`;
}

export function getSalaryDisplayParts(rawSalary) {
  if (!rawSalary) {
    return {
      primary: 'Salary not listed',
      secondary: null,
    };
  }

  const bounds = extractSalaryBounds(rawSalary);
  const currency = detectCurrency(rawSalary);
  if (!bounds || !currency) {
    return {
      primary: rawSalary,
      secondary: null,
    };
  }

  if (currency === 'USD') {
    return {
      primary: formatRange(bounds, 'USD') || rawSalary,
      secondary: `Approx. ${formatRange({ min: usdToInr(bounds.min), max: usdToInr(bounds.max) }, 'INR')}`,
    };
  }

  return {
    primary: formatRange(bounds, 'INR') || rawSalary,
    secondary: `Approx. ${formatRange({ min: inrToUsd(bounds.min), max: inrToUsd(bounds.max) }, 'USD')}`,
  };
}
