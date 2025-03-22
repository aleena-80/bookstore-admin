import Category from "../../models/Category.js";



export const renderCategories = async (req, res) => {
  try {
    const { search = '', page = 1 } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) query.name = { $regex: search, $options: 'i' };

    const totalCategories = await Category.countDocuments(query);
    const categories = await Category.find(query)
      .skip(skip)
      .limit(limit);

    res.render('admin/categories', {
      categories,
      totalPages: Math.ceil(totalCategories / limit),
      currentPage: Number(page),
      search,
      error: null
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).render('admin/error', { message: 'Failed to load categories.' });
  }
};
//-----------------------------------------------------------------------
// Add new category
export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const existingCategory = await Category.findOne({ name });

    if (existingCategory) {
      const categories = await Category.find();
      return res.render('admin/categories', {
        categories,
        totalPages: Math.ceil(categories.length / 10),
        currentPage: 1,
        search: '',
        error: 'Category already exists!'
      });
    }

    const newCategory = new Category({ name });
    await newCategory.save();
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Add Category Error:', error);
    res.status(500).render('admin/error', { message: 'Failed to add category.' });
  }
};
//---------------------------------------------------------------------

// Edit category
export const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const existingCategory = await Category.findOne({ name, _id: { $ne: id } });

    if (existingCategory) {
      const categories = await Category.find();
      return res.render('admin/categories', {
        categories,
        totalPages: Math.ceil(categories.length / 10),
        currentPage: 1,
        search: '',
        error: 'Category name already exists!'
      });
    }

    await Category.findByIdAndUpdate(id, { name });
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Edit Category Error:', error);
    res.status(500).render('admin/error', { message: 'Failed to edit category.' });
  }
};
//---------------------------------------------------------------------

// Delete category
export const deleteCategory = async (req, res) => {
    try {
      const { id } = req.params;
      await Category.findByIdAndDelete(id);
      res.redirect('/admin/categories');
    } catch (error) {
      console.error('Delete Category Error:', error);
      res.status(500).render('admin/error', { message: 'Failed to delete category.' });
    }
};





















// export const renderCategories = async (req, res) => {
//   try {
//     const { search = '', page = 1 } = req.query;
//     const limit = 10;
//     const skip = (page - 1) * limit;

//     let query = {};
//     if (search) query.name = { $regex: search, $options: 'i' };

//     const totalCategories = await Category.countDocuments(query);
//     const categories = await Category.find(query)
//       .skip(skip)
//       .limit(limit);

//     res.render('admin/categories', {
//       categories,
//       totalPages: Math.ceil(totalCategories / limit),
//       currentPage: Number(page),
//       search,
//       error: null
//     });
//   } catch (error) {
//     console.error('Get Categories Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to load categories.' });
//   }
// };

// export const addCategory = async (req, res) => {
//   try {
//     const { name } = req.body;
//     const existingCategory = await Category.findOne({ name });

//     if (existingCategory) {
//       const categories = await Category.find();
//       return res.render('admin/categories', {
//         categories,
//         totalPages: Math.ceil(categories.length / 10),
//         currentPage: 1,
//         search: '',
//         error: 'Category already exists!'
//       });
//     }

//     const newCategory = new Category({ name });
//     await newCategory.save();
//     res.redirect('/admin/categories');
//   } catch (error) {
//     console.error('Add Category Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to add category.' });
//   }
// };

// export const editCategory = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name } = req.body;
//     const existingCategory = await Category.findOne({ name, _id: { $ne: id } });

//     if (existingCategory) {
//       const categories = await Category.find();
//       return res.render('admin/categories', {
//         categories,
//         totalPages: Math.ceil(categories.length / 10),
//         currentPage: 1,
//         search: '',
//         error: 'Category name already exists!'
//       });
//     }

//     await Category.findByIdAndUpdate(id, { name });
//     res.redirect('/admin/categories');
//   } catch (error) {
//     console.error('Edit Category Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to edit category.' });
//   }
// };

// export const deleteCategory = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Category.findByIdAndDelete(id);
//     res.redirect('/admin/categories');
//   } catch (error) {
//     console.error('Delete Category Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to delete category.' });
//   }
// };