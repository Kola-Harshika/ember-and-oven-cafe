/** Customisation groups for the hand-cut fries & sides section. */
import type { OptionGroup } from '../types';

const FRY_SIZE: OptionGroup = {
  id: 'size',
  label: 'Portion',
  type: 'single',
  required: true,
  slot: 'size',
  choices: [
    { id: 'fry-size-regular', label: 'Regular cone', price: 0, art: 'portion-regular', default: true },
    { id: 'fry-size-jumbo', label: 'Jumbo basket', price: 100, art: 'portion-jumbo' },
    { id: 'fry-size-share', label: 'Sharing platter', price: 190, art: 'portion-share', badge: 'for three' },
  ],
};

const FRY_CUT: OptionGroup = {
  id: 'cut',
  label: 'Cut',
  type: 'single',
  required: true,
  slot: 'build',
  choices: [
    { id: 'cut-straight', label: 'Skin-on straight', price: 0, art: 'cut-straight', default: true },
    { id: 'cut-shoestring', label: 'Shoestring', price: 0, art: 'cut-shoestring' },
    { id: 'cut-wedge', label: 'Chunky wedges', price: 30, art: 'cut-wedge' },
    { id: 'cut-crinkle', label: 'Crinkle cut', price: 20, art: 'cut-crinkle' },
  ],
};

const FRY_SEASONING: OptionGroup = {
  id: 'seasoning',
  label: 'Seasoning',
  type: 'single',
  required: true,
  slot: 'flavour',
  choices: [
    { id: 'sea-salt', label: 'Flaky sea salt', price: 0, art: 'season-salt', default: true },
    { id: 'peri-peri', label: 'Peri peri masala', price: 30, art: 'season-peri', badge: 'heat' },
    { id: 'pepper-herb', label: 'Cracked pepper & herbs', price: 30, art: 'season-pepper' },
    { id: 'cheese-dust', label: 'Cheese dust', price: 70, art: 'season-cheese' },
    { id: 'truffle-salt', label: 'Truffle salt', price: 90, art: 'season-truffle', badge: 'chef' },
  ],
};

const FRY_DIPS: OptionGroup = {
  id: 'dips',
  label: 'Dips',
  helper: 'Three dips max — packed in little paper cups.',
  type: 'multi',
  min: 0,
  max: 3,
  slot: 'toppers',
  choices: [
    { id: 'dip-garlic', label: 'Roasted garlic aioli', price: 60, art: 'dip-garlic' },
    { id: 'dip-cheese', label: 'Smoky cheese sauce', price: 90, art: 'dip-cheese' },
    { id: 'dip-chipotle', label: 'Chipotle mayo', price: 60, art: 'dip-chipotle' },
    { id: 'dip-mint', label: 'Mint yoghurt', price: 50, art: 'dip-mint' },
    { id: 'dip-relish', label: 'Tomato chilli relish', price: 40, art: 'dip-relish' },
    { id: 'dip-truffle', label: 'Truffle mayo', price: 110, art: 'dip-truffle', badge: 'chef' },
  ],
};

const FRY_EXTRAS: OptionGroup = {
  id: 'extras',
  label: 'Pile it on',
  type: 'multi',
  min: 0,
  max: 3,
  slot: 'toppers',
  choices: [
    { id: 'extra-cheddar', label: 'Melted cheddar', price: 110, art: 'extra-cheddar' },
    { id: 'extra-parmesan', label: 'Herbed parmesan', price: 80, art: 'extra-parmesan' },
    { id: 'extra-onion', label: 'Crispy fried onion', price: 60, art: 'extra-onion' },
    { id: 'extra-jalapeno', label: 'Jalapeño crunch', price: 50, art: 'extra-jalapeno' },
    { id: 'extra-herbs', label: 'Coriander & lime', price: 30, art: 'extra-herbs' },
  ],
};

export const FRY_GROUPS: OptionGroup[] = [FRY_SIZE, FRY_CUT, FRY_SEASONING, FRY_DIPS, FRY_EXTRAS];
