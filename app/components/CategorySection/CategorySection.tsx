import { Category } from '../Category/Category';

type CategoryItem = {
  title: string;
  image: string;
};

const categories: CategoryItem[] = [
  {
    title: 'Table Slabs',
    image:
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Custom Table Tops',
    image:
      'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Coffee Table Slabs',
    image:
      'https://images.unsplash.com/photo-1592078615290-033ee584e267?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Charcuterie Slabs',
    image:
      'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Shelves',
    image:
      'https://images.unsplash.com/photo-1582582429416-3db17ed01e6e?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Mantles',
    image:
      'https://images.unsplash.com/photo-1616627457405-45b0cfdac0d0?auto=format&fit=crop&w=900&q=80',
  },
];

export function CategorySection() {
  return (
    <section className="category-section">
      <div className="category-section__container">
        <h2 className="category-section__title">Shop by Category</h2>
        <div className="category-section__grid">
          {categories.map((category) => (
            <Category key={category.title} image={category.image} title={category.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
