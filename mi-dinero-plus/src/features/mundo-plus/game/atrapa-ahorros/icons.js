import {
  FaCoins,
  FaMoneyBillWave,
  FaGem,
  FaFileInvoiceDollar,
  FaCreditCard,
  FaHamburger,
  FaGamepad,
  FaMobileAlt,
  FaTv,
  FaPiggyBank,
} from 'react-icons/fa'
import { MdSavings } from 'react-icons/md'
import { GiBasket } from 'react-icons/gi'

/**
 * Claves = campo iconKey de ITEM_TYPES
 * Aliases billBad / debt → compatibilidad
 */
export const GameIcons = {
  // Buenos
  coin: FaCoins,
  bill: FaMoneyBillWave,
  gem: FaGem,
  piggy: FaPiggyBank,

  // Malos (finanzas)
  factura: FaFileInvoiceDollar,
  deuda: FaCreditCard,
  billBad: FaFileInvoiceDollar,
  debt: FaCreditCard,

  // Malos (gastos cotidianos)
  burger: FaHamburger,
  console: FaGamepad,
  phone: FaMobileAlt,
  tv: FaTv,

  // UI
  basket: GiBasket,
  fab: FaGamepad,
  savings: MdSavings,
}

export function getGameIcon(key) {
  return GameIcons[key] || GameIcons.coin
}