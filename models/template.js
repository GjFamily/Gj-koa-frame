var mongodb = require("../tools/mongodb")

var TemplateSchema = new mongodb.Schema({
  title: String
})
TemplateSchema.methods.test = () => (`test ${this.title}`)

var TemplateModel = mongodb.model('Template', TemplateSchema)

module.exports = TemplateModel
