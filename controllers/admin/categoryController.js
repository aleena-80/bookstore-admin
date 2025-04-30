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

    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.json({
        categories,
        totalPages: Math.ceil(totalCategories / limit),
      });
    }

    res.render('admin/categories', {
      categories,
      totalPages: Math.ceil(totalCategories / limit),
      currentPage: Number(page),
      search,
      error: null,
    });
  } catch (error) {
    console.error('Get Categories Error:', error.message, error.stack);
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({ error: 'Failed to load categories' });
    }
    res.status(500).render('admin/error', { message: 'Failed to load categories.' });
  }
};
//----------------------------------------------------------------------------------
export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;
    const normalizedName = name.trim();
    const existingCategory = await Category.findOne({ 
      name: { $regex: `^${normalizedName}$`, $options: 'i' },
    });

    if (existingCategory) {
      const categories = await Category.find();
      return res.render('admin/categories', {
        categories,
        totalPages: Math.ceil(categories.length / 10),
        currentPage: 1,
        search: '',
        error: 'Category already exists (case-insensitive)!',
      });
    }

    const newCategory = new Category({ name: normalizedName });
    await newCategory.save();
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Add Category Error:', error.message, error.stack);
    res.status(500).render('admin/error', { message: 'Failed to add category.' });
  }
};
//----------------------------------------------------------------------------
export const editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const normalizedName = name.trim();
    const existingCategory = await Category.findOne({ 
      name: { $regex: `^${normalizedName}$`, $options: 'i' },
      _id: { $ne: id },
    });

    if (existingCategory) {
      const categories = await Category.find();
      return res.render('admin/categories', {
        categories,
        totalPages: Math.ceil(categories.length / 10),
        currentPage: 1,
        search: '',
        error: 'Category name already exists (case-insensitive)!',
      });
    }

    await Category.findByIdAndUpdate(id, { name: normalizedName });
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Edit Category Error:', error.message, error.stack);
    res.status(500).render('admin/error', { message: 'Failed to edit category.' });
  }
};
//-----------------------------------------------
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    await Category.findByIdAndDelete(id,{ isDeleted: true });
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Delete Category Error:', error.message, error.stack);
    res.status(500).render('admin/error', { message: 'Failed to delete category.' });
  }
};
//---------------------------------------------------
export const toggleCategoryListing = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    category.isDeleted = !category.isDeleted;
    await category.save();
    res.json({ success: true, isDeleted: category.isDeleted });
  } catch (error) {
    console.error('Toggle Category Error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to toggle category listing' });
  }
};
//-----------------------------------------------------------
export const updateCategoryOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { offer } = req.body;
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const offerValue = Math.max(0, Math.min(100, Number(offer) || 0));
    category.offer = offerValue;
    await category.save();
    res.json({ success: true, offer: category.offer });
  } catch (error) {
    console.error('Update Category Offer Error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to update category offer' });
  }
};
//-------------------------------------------------------------------