import { MenuItem } from './types';

export const INITIAL_MENU: MenuItem[] = [
  {
    id: '1',
    name: 'X-Burguer Supremo',
    description: 'Suculento hambúrguer artesanal de 180g, abraçado por cheddar derretido e a crocância irresistível do bacon. O sabor supremo que você merece!',
    price: 28.90,
    category: 'Lanches',
    imageUrl: 'https://picsum.photos/seed/burger/400/300'
  },
  {
    id: '2',
    name: 'Pizza Calabresa',
    description: 'Massa fina crocante, molho de tomate caseiro, muita calabresa e cebola fresca.',
    price: 45.00,
    category: 'Pizzas',
    imageUrl: 'https://picsum.photos/seed/pizza/400/300'
  },
  {
    id: '3',
    name: 'Açaí Turbinado',
    description: '500ml de açaí puro com granola, banana, morango e leite condensado.',
    price: 18.50,
    category: 'Sobremesas',
    imageUrl: 'https://picsum.photos/seed/acai/400/300'
  },
  {
    id: '4',
    name: 'Coca-Cola 2L',
    description: 'Refrigerante gelado para acompanhar seu pedido.',
    price: 12.00,
    category: 'Bebidas',
    imageUrl: 'https://picsum.photos/seed/coke/400/300'
  },
  {
    id: '5',
    name: 'Combo Família',
    description: '2 Lanches, 1 Pizza média e 1 Refrigerante.',
    price: 89.90,
    category: 'Combos',
    imageUrl: 'https://picsum.photos/seed/combo/400/300'
  }
];