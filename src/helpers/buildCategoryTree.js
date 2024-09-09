export const buildCategoryTree = (categories, parentId = null) => {
  const categoryTree = [];

  categories
    .filter((category) => category.parent === parentId)
    .forEach((category) => {
      const children = buildCategoryTree(categories, category._id);
      if (children.length > 0) {
        category.children = children;
      }
      categoryTree.push(category);
    });

  return categoryTree;
};
