// Regional settings come from .env so the same code can be deployed in any country.
// Amounts are integers in the currency's minor unit (cents, fils, paise...).
const env = import.meta.env
if (!env.VITE_CURRENCY) throw new Error('Set VITE_CURRENCY in .env to an ISO 4217 code, e.g. USD, EUR, INR')

export const taxRate = Number(env.VITE_TAX_RATE ?? 0) // percent, e.g. 5 or 7.25
export const taxLabel = env.VITE_TAX_LABEL || 'Tax'

// Intl picks the right symbol, placement, separators and decimals (JPY 0, KWD 3) for the locale.
const fmt = new Intl.NumberFormat(env.VITE_LOCALE || undefined, { style: 'currency', currency: env.VITE_CURRENCY })
const decimals = fmt.resolvedOptions().maximumFractionDigits

export const money = (minor) => fmt.format(minor / 10 ** decimals)
export const taxOn = (subtotal) => Math.round((subtotal * taxRate) / 100) // must match OrderController
