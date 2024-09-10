export const buildCategoryTree = (categories, parentId = null, level = 0) => {
  const categoryTree = [];

  categories
    .filter((category) =>
      parentId === null
        ? category.parent === null
        : category.parent && category.parent.toString() === parentId.toString()
    )
    .forEach((category) => {
      const nodeCategory = {
        _id: category._id,
        name: category.name,
        slug: category.slug,
        level: category.level,
        parent: category.parent,
      };

      const children = buildCategoryTree(categories, category._id, level + 1);
      if (children.length > 0) {
        nodeCategory.children = children;
      }
      categoryTree.push(nodeCategory);
    });

  return categoryTree;
};
