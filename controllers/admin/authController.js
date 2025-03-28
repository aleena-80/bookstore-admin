
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Admin from "../../models/Admin.js";


export const getAdminLogin = (req, res) => {
  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'admin') {
        return res.redirect('/admin/dashboard');
      }
    } catch (error) {
      console.log('Invalid token on login check:', error.message);
      res.clearCookie('token'); // Clear invalid token
    }
  }
  res.render('admin/login', { message: null });
};
//------------------------------------------------------------------------------------
export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Early cookie check
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role === 'admin') {
          return res.redirect('/admin/dashboard');
        }
      } catch (error) {
        res.clearCookie('token'); // Clear invalid token
      }
    }

    // Validation
    let errors = [];
    if (!email || !password) errors.push('Email and password are required');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');
    if (password && password.length < 6) errors.push('Password must be at least 6 characters long');

    if (errors.length > 0) {
      return res.render('admin/login', { message: errors.join(', ') });
    }

    // Admin check
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.render('admin/login', { message: 'Admin not found' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.render('admin/login', { message: 'Invalid credentials' });
    }

    // Generate token
    const newToken = jwt.sign({ id: admin._id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.redirect('/admin/dashboard');
  } catch (error) {
    console.error('Login Admin Error:', error);
    return res.render('admin/login', { message: 'Server Error' });
  }
};
//-------------------------------------------------------------------------------------  
export const logoutAdmin = (req, res) => {
    res.clearCookie("token");
res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private'); 
  res.redirect('/admin/login'); // ✅ Redirect to login
};
//----------------------------------------------------------------------------------------



















// export const renderLogin = (req, res) => {
//   res.render("admin/login", { message: null });
// };

// export const loginAdmin = async (req, res) => {
//   const { email, password } = req.body;

//   if (!email || !password) {
//     return res.render("admin/login", { message: "Email and password are required" });
//   }

//   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//     return res.render("admin/login", { message: "Invalid email format" });
//   }

//   if (password.length < 6) {
//     return res.render("admin/login", { message: "Password must be at least 6 characters long" });
//   }

//   try {
//     const admin = await Admin.findOne({ email });
//     if (!admin) {
//       return res.render("admin/login", { message: "Admin not found" });
//     }

//     const isMatch = await bcrypt.compare(password, admin.password);
//     if (!isMatch) {
//       return res.render("admin/login", { message: "Invalid credentials" });
//     }

//     const token = jwt.sign({ id: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "3d" });
//     res.cookie("token", token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "lax",
//     });

//     return res.redirect("/admin/dashboard");
//   } catch (error) {
//     res.render("admin/login", { message: "Server Error" });
//   }
// };

// export const logoutAdmin = (req, res) => {
//   res.clearCookie("token");
//   res.redirect("/admin/login");
// };