let local = {}
try {
  local = require('./local')
} catch (e) {
  local = {}
}

let env_config = {
  'development': {
    server_port: process.env.PORT || 3000,
    debug: true,
    mogodb_port: local["mogodb_port"]
  },
  'test': {
    server_port: "",
    debug: true,
    mogodb_port: ''
  },
  'production': {
    server_port: "",
    debug: false,
    mogodb_port: ''
  }
}

const NODE_ENV = process.env.NODE_ENV || 'development'
// ========================================================
// Default Configuration
// ========================================================
const config = Object.assign(env_config[NODE_ENV], {
  // ----------------------------------
  // Project Structure
  // ----------------------------------
  env: NODE_ENV
})

module.exports = config
