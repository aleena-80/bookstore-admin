import Language from "../../models/Language.js";


export const getLanguages = async (req, res) => {
  try {
    const { search = '', page = 1 } = req.query;
    const limit = 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) query.name = { $regex: search, $options: 'i' };

    const totalLanguages = await Language.countDocuments(query);
    const languages = await Language.find(query)
      .skip(skip)
      .limit(limit);

    res.render('admin/languages', {
      languages,
      totalPages: Math.ceil(totalLanguages / limit),
      currentPage: Number(page),
      search,
      error: null
    });
  } catch (error) {
    console.error('Get Languages Error:', error);
    res.status(500).render('admin/error', { message: 'Failed to load languages.' });
  }
};
//----------------------------------------------------------------------
export const addLanguage = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).send("Language name required");
    const language = new Language({ name });
    await language.save();
    res.redirect("/admin/languages");
  } catch (error) {
    console.error("Add Language Error:", error);
    res.status(500).send("Failed to add language"); 
  }
};
//-------------------------------------------------------------------
export const editLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const existingLanguage = await Language.findOne({ name, _id: { $ne: id } });

    if (existingLanguage) {
      const languages = await Language.find();
      return res.render('admin/languages', {
        languages,
        totalPages: Math.ceil(languages.length / 10),
        currentPage: 1,
        search: '',
        error: 'Language name already exists!'
      });
    }

    await Language.findByIdAndUpdate(id, { name });
    res.redirect('/admin/languages');
  } catch (error) {
    console.error('Edit Language Error:', error);
    res.status(500).render('admin/error', { message: 'Failed to edit language.' });
  }
};
//---------------------------------------------------------------------------
export const deleteLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    await Language.findByIdAndDelete(id);
    res.redirect('/admin/languages');
  } catch (error) {
    console.error('Delete Language Error:', error);
    res.status(500).render('admin/error', { message: 'Failed to delete language.' });
  }
};













// export const getLanguages = async (req, res) => {
//   try {
//     const { search = '', page = 1 } = req.query;
//     const limit = 10;
//     const skip = (page - 1) * limit;

//     let query = {};
//     if (search) query.name = { $regex: search, $options: 'i' };

//     const totalLanguages = await Language.countDocuments(query);
//     const languages = await Language.find(query)
//       .skip(skip)
//       .limit(limit);

//     res.render('admin/languages', {
//       languages,
//       totalPages: Math.ceil(totalLanguages / limit),
//       currentPage: Number(page),
//       search,
//       error: null
//     });
//   } catch (error) {
//     console.error('Get Languages Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to load languages.' });
//   }
// };

// export const addLanguage = async (req, res) => {
//   try {
//     const { name } = req.body;
//     const existingLanguage = await Language.findOne({ name });

//     if (existingLanguage) {
//       const languages = await Language.find();
//       return res.render('admin/languages', {
//         languages,
//         totalPages: Math.ceil(languages.length / 10),
//         currentPage: 1,
//         search: '',
//         error: 'Language already exists!'
//       });
//     }

//     const newLanguage = new Language({ name });
//     await newLanguage.save();
//     res.redirect('/admin/languages');
//   } catch (error) {
//     console.error('Add Language Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to add language.' });
//   }
// };

// export const editLanguage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name } = req.body;
//     const existingLanguage = await Language.findOne({ name, _id: { $ne: id } });

//     if (existingLanguage) {
//       const languages = await Language.find();
//       return res.render('admin/languages', {
//         languages,
//         totalPages: Math.ceil(languages.length / 10),
//         currentPage: 1,
//         search: '',
//         error: 'Language name already exists!'
//       });
//     }

//     await Language.findByIdAndUpdate(id, { name });
//     res.redirect('/admin/languages');
//   } catch (error) {
//     console.error('Edit Language Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to edit language.' });
//   }
// };

// export const deleteLanguage = async (req, res) => {
//   try {
//     const { id } = req.params;
//     await Language.findByIdAndDelete(id);
//     res.redirect('/admin/languages');
//   } catch (error) {
//     console.error('Delete Language Error:', error);
//     res.status(500).render('admin/error', { message: 'Failed to delete language.' });
//   }
// };