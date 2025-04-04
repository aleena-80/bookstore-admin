// controllers/bannerController.js
import Banner from '../../models/Banner.js';
import upload from '../../middleware/upload.js';


export const addBanner = [
  upload.single('image'),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      if (!req.file) throw new Error('No image uploaded');
      const image = req.file.path; // Cloudinary URL
      const banner = new Banner({
        image,
        startDate,
        endDate,
        link: '/users/home', // Hardcoded
        active: true
      });
      await banner.save();
      res.redirect('/admin/banners');
    } catch (error) {
      console.error('Add Banner Error:', error.message);
      res.status(500).send('Server Error: ' + error.message); // Show error detail
    }
  }
];

export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find();
    res.render('admin/banners', { banners });
  } catch (error) {
    console.error('Get Banners Error:', error);
    res.status(500).send('Server Error');
  }
};

export const deleteBanner = async (req, res) => {
  try {
    await Banner.deleteOne({ _id: req.params.id });
    res.redirect('/admin/banners');
  } catch (error) {
    console.error('Delete Banner Error:', error);
    res.status(500).send('Server Error');
  }
};
