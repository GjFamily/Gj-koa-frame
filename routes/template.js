var template = require('../controllers/template')
var router = require('koa-router')({
  prefix: '/template'
})

router.get('/:id', template.getId)

module.exports = router
