/** Customisation groups for the wood-fired pizza section. */
import type { OptionGroup } from '../types';

export const PIZZA_SIZE: OptionGroup = {
  id: 'size',
  label: 'Size',
  helper: 'Pick how hungry the table is.',
  type: 'single',
  required: true,
  slot: 'size',
  choices: [
    { id: 'size-7', label: '7" Personal', hint: 'one very happy person', price: 0, art: 'size-personal', default: true },
    { id: 'size-10', label: '10" Regular', hint: 'serves two', price: 180, art: 'size-regular' },
    { id: 'size-13', label: '13" Large', hint: 'sharing between three', price: 340, art: 'size-large' },
  ],
};

const PIZZA_CRUST: OptionGroup = {
  id: 'crust',
  label: 'Crust',
  helper: 'Our dough cold-proofs for 48 hours.',
  type: 'single',
  required: true,
  slot: 'build',
  choices: [
    { id: 'crust-classic', label: 'Classic hand-tossed', price: 0, art: 'crust-classic', default: true },
    { id: 'crust-thin', label: 'Thin & crispy', hint: 'extra shatter', price: 30, art: 'crust-thin' },
    { id: 'crust-stuffed', label: 'Cheese-stuffed border', price: 110, art: 'crust-stuffed', badge: 'rich' },
    { id: 'crust-wheat', label: 'Wholewheat', price: 40, art: 'crust-wheat' },
  ],
};

const PIZZA_CHEESE: OptionGroup = {
  id: 'cheese',
  label: 'Cheese',
  type: 'single',
  required: true,
  slot: 'build',
  choices: [
    { id: 'cheese-regular', label: 'Aged mozzarella', price: 0, art: 'cheese-mozz', default: true },
    { id: 'cheese-extra', label: 'Extra mozzarella', hint: 'double the pull', price: 80, art: 'cheese-extra' },
    { id: 'cheese-blend', label: 'Four-cheese blend', price: 120, art: 'cheese-four' },
    { id: 'cheese-vegan', label: 'Vegan cashew cheese', price: 90, art: 'cheese-vegan', badge: 'vegan' },
    { id: 'cheese-none', label: 'No cheese', hint: 'marinara style', price: -40, art: 'cheese-none' },
  ],
};

const PIZZA_SAUCE: OptionGroup = {
  id: 'sauce',
  label: 'Sauce base',
  type: 'single',
  required: true,
  slot: 'flavour',
  choices: [
    { id: 'sauce-tomato', label: 'San Marzano tomato', price: 0, art: 'sauce-tomato', default: true },
    { id: 'sauce-arrabbiata', label: 'Spicy arrabbiata', price: 30, art: 'sauce-spicy', badge: 'heat' },
    { id: 'sauce-white', label: 'Creamy garlic white', price: 50, art: 'sauce-white' },
    { id: 'sauce-pesto', label: 'Pesto verde', price: 70, art: 'sauce-pesto' },
  ],
};

const PIZZA_TOPPINGS: OptionGroup = {
  id: 'toppings',
  label: 'Add toppings',
  helper: 'Up to five extras — every layer shows up in the live preview.',
  type: 'multi',
  min: 0,
  max: 5,
  slot: 'toppers',
  choices: [
    { id: 'top-olives', label: 'Black olives', price: 45, art: 'olives' },
    { id: 'top-jalapeno', label: 'Pickled jalapeños', price: 40, art: 'jalapeno' },
    { id: 'top-mushroom', label: 'Garlic mushrooms', price: 60, art: 'mushroom' },
    { id: 'top-onion', label: 'Red onion', price: 35, art: 'onion' },
    { id: 'top-corn', label: 'Sweetcorn', price: 35, art: 'corn' },
    { id: 'top-paneer', label: 'Paneer cubes', price: 80, art: 'paneer' },
    { id: 'top-chicken', label: 'Tandoori chicken', price: 110, art: 'chicken', badge: 'non-veg' },
    { id: 'top-pepperoni', label: 'Smoked pepperoni', price: 120, art: 'pepperoni', badge: 'non-veg' },
    { id: 'top-basil', label: 'Extra basil', price: 30, art: 'basil' },
    { id: 'top-tomato', label: 'Sun-dried tomato', price: 65, art: 'sundried' },
    { id: 'top-rocket', label: 'Wild rocket', price: 50, art: 'rocket' },
    { id: 'top-truffle', label: 'Truffle oil drizzle', price: 130, art: 'truffle', badge: 'chef' },
  ],
};

const PIZZA_FINISH: OptionGroup = {
  id: 'finish',
  label: 'Finish it with',
  type: 'single',
  slot: 'finish',
  choices: [
    { id: 'finish-none', label: 'Leave it as it is', price: 0, art: 'finish-none', default: true },
    { id: 'finish-honey', label: 'Hot honey drizzle', price: 50, art: 'finish-honey' },
    { id: 'finish-herbs', label: 'Oregano & chilli flakes', price: 20, art: 'finish-herbs' },
    { id: 'finish-butter', label: 'Garlic butter brush', price: 35, art: 'finish-butter' },
    { id: 'finish-balsamic', label: 'Balsamic glaze', price: 45, art: 'finish-balsamic' },
  ],
};

export const PIZZA_GROUPS: OptionGroup[] = [
  PIZZA_SIZE,
  PIZZA_CRUST,
  PIZZA_CHEESE,
  PIZZA_SAUCE,
  PIZZA_TOPPINGS,
  PIZZA_FINISH,
];
