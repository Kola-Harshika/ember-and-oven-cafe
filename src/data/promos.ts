/** Coupons, tips, fulfilment modes and payment methods for the checkout flow. */

export type OrderMode = 'dine-in' | 'takeaway' | 'delivery';

export interface ModeOption {
  id: OrderMode;
  name: string;
  blurb: string;
  /** added kitchen + handover time in minutes */
  extraMinutes: number;
  /** flat fee in rupees */
  fee: number;
  icon: string;
}

export const ORDER_MODES: ModeOption[] = [
  {
    id: 'dine-in',
    name: 'Dine in',
    blurb: 'A table with the warm lights',
    extraMinutes: 2,
    fee: 0,
    icon: 'table',
  },
  {
    id: 'takeaway',
    name: 'Takeaway',
    blurb: 'Packed and waiting at the counter',
    extraMinutes: 1,
    fee: 0,
    icon: 'bag',
  },
  {
    id: 'delivery',
    name: 'Delivery',
    blurb: 'Within 4 km, in a thermal box',
    extraMinutes: 9,
    fee: 39,
    icon: 'scooter',
  },
];

export interface Coupon {
  code: string;
  label: string;
  blurb: string;
  /** percentage off the subtotal */
  percent?: number;
  /** flat rupees off */
  flat?: number;
  /** cap for percentage coupons */
  maxDiscount?: number;
  minSubtotal: number;
}

export const COUPONS: Coupon[] = [
  {
    code: 'EMBER10',
    label: '10% off',
    blurb: '10% off, up to ₹150 — every day',
    percent: 10,
    maxDiscount: 150,
    minSubtotal: 400,
  },
  {
    code: 'FIRSTBITE',
    label: '₹100 off',
    blurb: '₹100 off your first order above ₹599',
    flat: 100,
    minSubtotal: 599,
  },
  {
    code: 'OVENFRIES',
    label: 'Free fries',
    blurb: '₹179 off when you order two pizzas or more',
    flat: 179,
    minSubtotal: 700,
  },
];

export const TIP_PRESETS = [0, 5, 10, 15] as const;

/** Tax applied to the subtotal, Indian GST style. */
export const TAX_RATE = 0.05;
/** Delivery is free above this subtotal. */
export const FREE_DELIVERY_ABOVE = 799;

export interface PaymentMethod {
  id: 'upi' | 'card' | 'wallet' | 'cash';
  name: string;
  blurb: string;
  /** shown instead of a full form */
  instant?: boolean;
}

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'upi', name: 'UPI', blurb: 'Scan the code or pay from your UPI app', instant: true },
  { id: 'card', name: 'Card', blurb: 'Visa, Mastercard, RuPay', instant: true },
  { id: 'wallet', name: 'Ember Wallet', blurb: 'Balance ₹1,240 · 2% cashback' },
  { id: 'cash', name: 'Cash at counter', blurb: 'Pay when you collect or get served' },
];

/** Simple emoji-free "status" line per proof-of-craft on the home page. */
export const CRAFT_STEPS = [
  {
    title: 'Dough, yesterday',
    copy: 'Pizza dough is mixed at 6pm and cold-proofed until tomorrow’s first order.',
  },
  {
    title: 'Fries, cut at 7am',
    copy: 'Maris Pipers are cut, blanched and rested before the doors open.',
  },
  {
    title: 'Ice cream, churned in house',
    copy: 'Every shake starts with ice cream churned in the back kitchen.',
  },
  {
    title: 'Watched at the pass',
    copy: 'Nothing leaves the kitchen until it has been checked against your sheet.',
  },
] as const;
