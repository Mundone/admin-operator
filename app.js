const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');

const url = "mongodb://localhost:27017/users";
const port = 3000;
const app = express();
const bodyParser = require('body-parser');

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(url, {})
    .then(result => console.log("database connected"))
    .catch(err => console.log(err))

app.listen(port, () => {
    console.log("server is running at port: " + port)
})

const UserModel = mongoose.model('UserSchema',
    new mongoose.Schema({
        username: String,
        password: String,
        isAdmin: Boolean,
        isOperator: Boolean
    })
);

const ProductModel = mongoose.model('ProductSchema',
    new mongoose.Schema({
        code: String,
        name: String,
        price: Number
    })
);

app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false
}));

function getUser(req) {
    user = {};
    user.username = req.session.isLogged ? req.session.username : 'Guest';
    user.isOperator = req.session.isAdmin || req.session.isOperator ? req.session.isAdmin || req.session.isOperator : false;
    user.isAdmin = req.session.isAdmin ? req.session.isAdmin : false;
    user.isLogged = req.session.isLogged ? req.session.isLogged : false;
    return user;
}

app.get('/', async (req, res) => {
    var text = req.query.text;
    user = getUser(req);
    if (user.isLogged) {
        const search = req.query.search === undefined ? '' : req.query.search;
        const regex = new RegExp(search, 'i');
        const numberSearch = isNaN(search) ? null : Number(search);
        ProductModel.find({ $or: [{ code: { $regex: regex } }, { name: { $regex: regex } }, { price: numberSearch }] },).then((products) => {
            res.render('index', { text: text, products: products, user: user });
        }).catch((error) => {
            console.error('Error: ', error);
        });
    } else {
        res.redirect('login');
    }
});

app.get('/users', async (req, res) => {
    var text = req.query.text;
    user = getUser(req);
    const search = req.query.search === undefined ? '' : req.query.search;
    const regex = new RegExp(search, 'i');
    UserModel.find({ username: { $regex: regex } }).then((datas) => {
        res.render('users', { text: text, datas: datas, user: user });
    }).catch((error) => {
        console.error('Error: ', error);
    });
});

app.get('/login', async (req, res) => {
    user = getUser(req);
    res.render('login', { user: user });
});

app.post('/login', (req, res) => {
    UserModel.find({ username: req.body.username }).then((users) => {
        users.forEach(user => {
            if (user.password === req.body.password) {
                req.session.username = req.body.username;
                req.session.isAdmin = user.isAdmin;
                req.session.isOperator = user.isOperator;
                req.session.isLogged = true;
                var text = encodeURIComponent('Амжилттай нэвтэрлээ');
                res.redirect('/?text=' + text);
            } else {
                return res.status(400).json({
                    message: "Username or Password not present",
                })
            }
        });
    }).catch((error) => {
        console.error('Error: ', error);
    });
});

app.get('/register', async (req, res) => {
    user = getUser(req);
    res.render('register', { user: user, data: {} });
});

app.post('/register', async (req, res) => {
    isAdmin = req.body.isAdmin === 'on' ? true : false;
    const newUser = new UserModel({
        username: req.body.username,
        password: req.body.password,
        isAdmin: isAdmin,
        isOperator: false
    });
    await newUser.save();
    var text = encodeURIComponent('Амжилттай бүртгэлээ');
    res.redirect('/?text=' + text);
});

app.post('/logout', (req, res) => {
    req.session.username = 'Guest';
    req.session.isAdmin = false;
    req.session.isOperator = false;
    req.session.isLogged = false;
    res.redirect('/login');
});

app.get('/edit/:id', async (req, res) => {
    user = getUser(req);
    res.render('edit', { user: user });
});

app.post('/edit/:id', async (req, res) => {
    if (req.session.isLogged === true && req.session.isAdmin === true) {

    }
    const newUser = new UserModel({
        username: req.body.username,
        password: req.body.password,
        isAdmin: isAdmin
    });
    await newUser.save();
    var text = encodeURIComponent('Амжилттай бүртгэлээ');
    res.redirect('/?text=' + text);
});

app.get('/add', async (req, res) => {
    user = getUser(req);
    res.render('add', { user: user, product: {} });
});

app.post('/add', async (req, res) => {
    const newProduct = new ProductModel({
        code: req.body.code,
        name: req.body.name,
        price: req.body.price
    });
    await newProduct.save();
    var text = encodeURIComponent('Амжилттай бүртгэлээ');
    res.redirect('/?text=' + text);
});

app.get('/editProduct', async (req, res) => {
    user = getUser(req);
    product = {};
    await ProductModel.findOne({ _id: req.query.id }).then((element) => {
        product = element;
    }).catch((error) => {
        console.error('Error :', error);
    });
    res.render('add', { user: user, product: product });
});

app.post('/editProduct', async (req, res) => {
    const update = { code: req.body.code, name: req.body.name, price: req.body.price };
    await ProductModel.findByIdAndUpdate(req.query.id, update);
    var text = encodeURIComponent('Амжилттай засварлалаа');
    res.redirect('/?text=' + text);
});

app.post('/deleteProduct', async (req, res) => {
    await ProductModel.findByIdAndDelete(req.body.id);
    var text = encodeURIComponent('Амжилттай устгалаа');
    res.redirect('/?text=' + text);
});

app.get('/editUser', async (req, res) => {
    user = getUser(req);
    data = {};
    await UserModel.findOne({ _id: req.query.id }).then((element) => {
        data = element;
    }).catch((error) => {
        console.error('Error :', error);
    });
    res.render('register', { user: user, data: data });
});

app.post('/editUser', async (req, res) => {
    console.log(req.body.isOperator)
    isOperator = req.body.isOperator === 'on' ? true : false;
    const update = { username: req.body.username, isOperator: isOperator };
    await UserModel.findByIdAndUpdate(req.query.id, update);
    var text = encodeURIComponent('Амжилттай засварлалаа');
    res.redirect('/users/?text=' + text);
});

app.post('/deleteUser', async (req, res) => {
    await UserModel.findByIdAndDelete(req.body.id);
    var text = encodeURIComponent('Амжилттай устгалаа');
    res.redirect('/users/?text=' + text);
});