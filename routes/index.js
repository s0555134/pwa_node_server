var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// router.get('/recipes', function(req, res, next) {
//     // getAllRecipes(res);
//     // setDataToDb();
//   res.status(200).json({
//     message: 'Hier sind Rezepte'
//   })
// });
// router.post('/poste-dein-rezept', function(req, res, next) {
//     // getAllRecipes(res);
//     // setDataToDb();
//   // setDataToDb();
//   res.status(200).json({
//     message: 'Poste Hier deine Rezepte'
//   })
// });

module.exports = router;
