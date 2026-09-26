/** Customisation groups for the thick shake counter. */
import type { OptionGroup } from '../types';

const SHAKE_SIZE: OptionGroup = {
  id: 'size',
  label: 'Size',
  type: 'single',
  required: true,
  slot: 'size',
  choices: [
    { id: 'shake-300', label: 'Regular 300 ml', price: 0, art: 'glass-tulip', default: true },
    { id: 'shake-450', label: 'Large 450 ml', price: 120, art: 'glass-tall' },
    { id: 'shake-600', label: 'Mason jar 600 ml', price: 180, art: 'glass-mason', badge: 'photo-ready' },
  ],
};

const SHAKE_BASE: OptionGroup = {
  id: 'base',
  label: 'Blended with',
  type: 'single',
  required: true,
  slot: 'build',
  choices: [
    { id: 'base-milk', label: 'Chilled whole milk', price: 0, art: 'base-milk', default: true },
    { id: 'base-oat', label: 'Oat milk', price: 60, art: 'base-oat', badge: 'vegan' },
    { id: 'base-almond', label: 'Almond milk', price: 60, art: 'base-almond', badge: 'vegan' },
    { id: 'base-icecream', label: 'Extra thick (vanilla ice cream)', price: 100, art: 'base-thick' },
    { id: 'base-yoghurt', label: 'Greek yoghurt base', price: 70, art: 'base-yoghurt' },
  ],
};

const SHAKE_SWEETNESS: OptionGroup = {
  id: 'sweetness',
  label: 'Sweetness',
  type: 'single',
  required: true,
  slot: 'flavour',
  choices: [
    { id: 'sweet-regular', label: 'Regular', price: 0, art: 'sweet-regular', default: true },
    { id: 'sweet-low', label: 'Less sugar', price: 0, art: 'sweet-low' },
    { id: 'sweet-none', label: 'No added sugar', price: 20, art: 'sweet-none' },
    { id: 'sweet-extra', label: 'Extra sweet', price: 0, art: 'sweet-extra' },
  ],
};

const SHAKE_BOOSTERS: OptionGroup = {
  id: 'boosters',
  label: 'Blend-ins',
  helper: 'Whizzed straight into the shake.',
  type: 'multi',
  min: 0,
  max: 4,
  slot: 'toppers',
  choices: [
    { id: 'boost-espresso', label: 'Cold brew shot', price: 80, art: 'boost-espresso' },
    { id: 'boost-chocochips', label: 'Dark chocolate chips', price: 50, art: 'boost-chocochips' },
    { id: 'boost-peanut', label: 'Peanut butter', price: 90, art: 'boost-peanut' },
    { id: 'boost-brownie', label: 'Brownie chunks', price: 100, art: 'boost-brownie' },
    { id: 'boost-protein', label: 'Protein scoop', price: 120, art: 'boost-protein' },
    { id: 'boost-cookie', label: 'Cookie crumbs', price: 40, art: 'boost-cookie' },
    { id: 'boost-banana', label: 'Banana', price: 40, art: 'boost-banana' },
  ],
};

const SHAKE_TOPPINGS: OptionGroup = {
  id: 'toppings',
  label: 'On top',
  helper: 'The photogenic part. Up to four.',
  type: 'multi',
  min: 0,
  max: 4,
  slot: 'toppers',
  choices: [
    { id: 'top-whip', label: 'Whipped cream', price: 50, art: 'whip' },
    { id: 'top-chocodrizzle', label: 'Chocolate drizzle', price: 40, art: 'drizzle-choco' },
    { id: 'top-carameldrizzle', label: 'Caramel drizzle', price: 40, art: 'drizzle-caramel' },
    { id: 'top-marshmallow', label: 'Toasted marshmallow', price: 60, art: 'marshmallow' },
    { id: 'top-sprinkles', label: 'Sprinkles', price: 20, art: 'sprinkles' },
    { id: 'top-cone', label: 'Waffle cone shard', price: 70, art: 'cone' },
    { id: 'top-berry', label: 'Fresh berry crown', price: 60, art: 'berry' },
  ],
};

export const SHAKE_GROUPS: OptionGroup[] = [
  SHAKE_SIZE,
  SHAKE_BASE,
  SHAKE_SWEETNESS,
  SHAKE_BOOSTERS,
  SHAKE_TOPPINGS,
];
