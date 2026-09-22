import { FaCoins, FaMoneyBillWave, FaGem, FaFileInvoiceDollar, FaCreditCard, FaGamepad } from 'react-icons/fa'
import { MdSavings } from 'react-icons/md'
import { GiBasket } from 'react-icons/gi'

export const GameIcons = {
  coin: FaCoins,
  bill: FaMoneyBillWave,
  gem: FaGem,
  billBad: FaFileInvoiceDollar,
  debt: FaCreditCard,
  basket: GiBasket,
  fab: FaGamepad,
  savings: MdSavings,
}

export function getGameIcon(key) {
  return GameIcons[key] || GameIcons.coin
}