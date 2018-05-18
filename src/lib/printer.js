/**
 * Created by gaojie on 2017/4/2.
 */

const Image = require('./image');
const qr = require('./qr-code');
const getPixels = require('get-pixels');
const iconv = require('iconv-lite');
const Buffer = require('./buffer');

/**
 * [function ESC/POS Printer]
 * @return {Printer} printer  [the escpos printer instance]
 */
function Printer(){
  if (!(this instanceof Printer)) {
    return new Printer();
  }
  this.buffer = new Buffer();
}

/**
 * Fix bottom margin
 * @param  {[String]} size
 * @return Printer instance
 */
Printer.prototype.marginBottom = function(size){
  this.buffer.write(_.MARGINS.BOTTOM);
  this.buffer.writeUInt8(size);
  return this;
};

/**
 * Fix left margin
 * @param  {[String]} size
 * @return Printer instance
 */
Printer.prototype.marginLeft = function(size){
  this.buffer.write(_.MARGINS.LEFT);
  this.buffer.writeUInt8(size);
  return this;
};

/**
 * Fix right margin
 * @param  {[String]} size
 * @return Printer instance
 */
Printer.prototype.marginRight = function(size){
  this.buffer.write(_.MARGINS.RIGHT);
  this.buffer.writeUInt8(size);
  return this;
};

/**
 * Send data to hardware and flush buffer
 * @return printer instance
 */
Printer.prototype.flush = function(){
  return this.buffer.flush();
};

/**
 * [function print]
 * @param  {string}  content  [description]
 * @param  {[String]}  encoding [description]
 * @return Printer instance
 */
Printer.prototype.print = function(content){
  this.buffer.write(content);
  return this;
};
/**
 * [function println]
 * @param  {[String]}  content  [description]
 * @param  {[String]}  encoding [description]
 * @return Printer instance
 */
Printer.prototype.println = function(content){
  return this.print([ content, _.EOL ].join(''));
};

/**
 * [function Print alpha-numeric text]
 * @param  {[String]}  content  [description]
 * @param  {[String]}  encoding [description]
 * @return Printer instance
 */
Printer.prototype.text = function(content, encoding){
  return this.print(iconv.encode(content + _.EOL, encoding || 'GB18030'));
};

/**
 * [line feed]
 * @param  n   [description]
 * @return {printer} printer [description]
 */
Printer.prototype.feed = function (n) {
  this.buffer.write(new Array(n || 1).fill(_.EOL).join(''));
  return this.flush();
};

/**
 * [feed control sequences]
 * @param  ctrl     [description]
 * @return Printer instance
 */
Printer.prototype.control = function(ctrl){
  this.buffer.write(_.FEED_CONTROL_SEQUENCES[
  'CTL_' + ctrl.toUpperCase()
    ]);
  return this;
};
/**
 * [text align]
 * @param  align    [description]
 * @return Printer instance
 */
Printer.prototype.align = function(align){
  this.buffer.write(_.TEXT_FORMAT[
  'TXT_ALIGN_' + align.toUpperCase()
    ]);
  return this;
};
/**
 * [font family]
 * @param  family  [description]
 * @return {Printer} printer [description]
 */
Printer.prototype.font = function(family){
  this.buffer.write(_.TEXT_FORMAT[
  'TXT_FONT_' + family.toUpperCase()
    ]);
  return this;
};
/**
 * [font style]
 * @param type
 * @return Printer instance
 */
Printer.prototype.style = function(type){
  switch(type.toUpperCase()){

    case 'B':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL_OFF);
      break;
    case 'I':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL_OFF);
      break;
    case 'U':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL_ON);
      break;
    case 'U2':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL2_ON);
      break;

    case 'BI':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL_OFF);
      break;
    case 'BIU':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL_ON);
      break;
    case 'BIU2':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL2_ON);
      break;
    case 'BU':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL_ON);
      break;
    case 'BU2':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL2_ON);
      break;
    case 'IU':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL_ON);
      break;
    case 'IU2':
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_ON);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL2_ON);
      break;

    case 'NORMAL':
    default:
      this.buffer.write(_.TEXT_FORMAT.TXT_BOLD_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_ITALIC_OFF);
      this.buffer.write(_.TEXT_FORMAT.TXT_UNDERL_OFF);
      break;

  }
  return this;
};

/**
 * [font size]
 * @param  {[String]}  width   [description]
 * @param  {[String]}  height  [description]
 * @return {Printer} printer [description]
 */
Printer.prototype.size = function(width, height) {

  if (2 >= width && 2 >= height) {

    this.buffer.write(_.TEXT_FORMAT.TXT_NORMAL);

    if (2 == width && 2 == height) {
      this.buffer.write(_.TEXT_FORMAT.TXT_4SQUARE);
    }
    else if (1 == width && 2 == height) {
      this.buffer.write(_.TEXT_FORMAT.TXT_2HEIGHT);
    }
    else if (2 == width && 1 == height) {
      this.buffer.write(_.TEXT_FORMAT.TXT_2WIDTH);
    }

  }
  else {

    this.buffer.write(_.TEXT_FORMAT.TXT_SIZE);
    this.buffer.write(_.TEXT_FORMAT.TXT_WIDTH[(8 >= width) ? width : 8]);
    this.buffer.write(_.TEXT_FORMAT.TXT_HEIGHT[(8 >= height) ? height : 8]);

  }

  return this;

};

/**
 * [set line spacing]
 * @param  {number} n [description]
 * @return {Printer}   [description]
 */
Printer.prototype.lineSpace = function(n) {
  if (n === undefined || n === null) {
    this.buffer.write(_.LINE_SPACING.LS_DEFAULT);
  } else {
    this.buffer.write(_.LINE_SPACING.LS_SET);
    this.buffer.writeUInt8(n);
  }
  return this;
};

/**
 * [hardware]
 * @param  {[type]}    hw       [description]
 * @return printer instance
 */
Printer.prototype.hardware = function(hw){
  this.buffer.write(_.HARDWARE[ 'HW_'+ hw ]);
  return this.flush();
};
/**
 * [barcode]
 * @param  {[type]}    code     [description]
 * @param  {[type]}    type     [description]
 * @param  {[type]}    width    [description]
 * @param  {[type]}    height   [description]
 * @param  {[type]}    position [description]
 * @param  {[type]}    font     [description]
 * @return Printer instance
 */
Printer.prototype.barcode = function(code, type, width, height, position, font){
  if(width >= 1 || width <= 255){
    this.buffer.write(_.BARCODE_FORMAT.BARCODE_WIDTH);
  }
  if(height >=2  || height <= 6){
    this.buffer.write(_.BARCODE_FORMAT.BARCODE_HEIGHT);
  }
  this.buffer.write(_.BARCODE_FORMAT[
  'BARCODE_FONT_' + (font || 'A').toUpperCase()
    ]);
  this.buffer.write(_.BARCODE_FORMAT[
  'BARCODE_TXT_' + (position || 'BLW').toUpperCase()
    ]);
  this.buffer.write(_.BARCODE_FORMAT[
  'BARCODE_' + ((type || 'EAN13').replace('-', '_').toUpperCase())
    ]);
  this.buffer.write(code);
  return this;
};

/**
 * [print qrcode]
 * @param  {[type]} code    [description]
 * @param  {[type]} version [description]
 * @param  {[type]} level   [description]
 * @param  {[type]} size    [description]
 * @return {Printer}         [description]
 */
Printer.prototype.qrcode = function(code, version, level, size){
  this.buffer.write(_.CODE2D_FORMAT.TYPE_QR);
  this.buffer.write(_.CODE2D_FORMAT.CODE2D);
  this.buffer.writeUInt8(version || 3);
  this.buffer.write(_.CODE2D_FORMAT[
  'QR_LEVEL_' + (level || 'L').toUpperCase()
    ]);
  this.buffer.writeUInt8(size || 6);
  this.buffer.writeUInt16LE(code.length);
  this.buffer.write(code);
  return this;
};

/**
 * [print qrcode image]
 * @param  {[type]}   content  [description]
 * @param  {[type]}   options  [description]
 * @param  {Function} callback [description]
 * @return {Printer}            [description]
 */
Printer.prototype.qrimage = function(content, options, callback){
  var self = this;
  if(typeof options == 'function'){
    callback = options;
    options = null;
  }
  options = options || { type: 'png', mode: 'dhdw' };
  var buffer = qr.build(content, options);
  var type = [ 'image', options.type ].join('/');
  getPixels(buffer, type, function (err, pixels) {
    if(err) return callback && callback(err);
    self.raster(new Image(pixels), options.mode);
    callback && callback.call(self, null, self);
  });
  return this;
};

/**
 * [image description]
 * @param  {[type]} image   [description]
 * @param  density [description]
 * @return {Printer}         [description]
 */
Printer.prototype.image = function(image, density){
  if(!(image instanceof Image))
    throw new TypeError('Only escpos.Image supported');
  density = density || 'd24';
  var n = ~[ 'd8', 's8' ].indexOf(density) ? 1 : 3;
  var header = _.BITMAP_FORMAT['BITMAP_' + density.toUpperCase()];
  var bitmap = image.toBitmap(n * 8);
  var self = this;
  this.lineSpace(0); // set line spacing to 0
  bitmap.data.forEach(function (line) {
    self.buffer.write(header);
    self.buffer.writeUInt16LE(line.length / n);
    self.buffer.write(line);
    self.buffer.write(_.EOL);
  });
  // restore line spacing to default
  return this.lineSpace();
};

/**
 * [raster description]
 * @param  {Image} image [description]
 * @param  {[type]} mode  [description]
 * @return {Printer}       [description]
 */
Printer.prototype.raster = function (image, mode) {
  if(!(image instanceof Image))
    throw new TypeError('Only escpos.Image supported');
  mode = mode || 'normal';
  if (mode === 'dhdw' ||
    mode === 'dwh'  ||
    mode === 'dhw') mode = 'dwdh';
  var raster = image.toRaster();
  var header = _.GSV0_FORMAT['GSV0_' + mode.toUpperCase()];
  this.buffer.write(header);
  this.buffer.writeUInt16LE(raster.width);
  this.buffer.writeUInt16LE(raster.height);
  this.buffer.write(raster.data);
  return this;
};

/**
 * [function Cut paper]
 * @param  {[type]} part [description]
 * @param feed
 * @return printer instance
 */
Printer.prototype.cut = function(part, feed){
  this.feed(feed || 3);
  this.buffer.write(_.PAPER[
    part ? 'PAPER_PART_CUT' : 'PAPER_FULL_CUT'
    ]);
  return this.flush();
};

/**
 * [function Send pulse to kick the cash drawer]
 * @param  {[type]} pin [description]
 * @return printer instance
 */
Printer.prototype.cashdraw = function(pin){
  this.buffer.write(_.CASH_DRAWER[
  'CD_KICK_' + (pin || 2)
    ]);
  return this.flush();
};

/**
 * ESC/POS _ (Constants)
 */
var _ = {
  LF  : '\x0a',
  FS  : '\x1c',
  FF  : '\x0c',
  GS  : '\x1d',
  DLE : '\x10',
  EOT : '\x04',
  NUL : '\x00',
  ESC : '\x1b',
  EOL : '\n'
};


/**
 * [FEED_CONTROL_SEQUENCES Feed control sequences]
 * @type {Object}
 */
_.FEED_CONTROL_SEQUENCES = {
  CTL_LF  : '\x0a',   // Print and line feed
  CTL_FF  : '\x0c',   // Form feed
  CTL_CR  : '\x0d',   // Carriage return
  CTL_HT  : '\x09',   // Horizontal tab
  CTL_VT  : '\x0b',   // Vertical tab
};

_.LINE_SPACING = {
  LS_DEFAULT : '\x1b\x32',
  LS_SET     : '\x1b\x33'
};

/**
 * [HARDWARE Printer hardware]
 * @type {Object}
 */
_.HARDWARE = {
  HW_INIT   : '\x1b\x40'         , // Clear data in buffer and reset modes
  HW_SELECT : '\x1b\x3d\x01'     , // Printer select
  HW_RESET  : '\x1b\x3f\x0a\x00' , // Reset printer hardware
};

/**
 * [CASH_DRAWER Cash Drawer]
 * @type {Object}
 */
_.CASH_DRAWER = {
  CD_KICK_2 : '\x1b\x70\x00'      , // Sends a pulse to pin 2 []
  CD_KICK_5 : '\x1b\x70\x01'      , // Sends a pulse to pin 5 []
};

/**
 * [MARGINS Margins sizes]
 * @type {Object}
 */
_.MARGINS = {
  BOTTOM:    '\x1b\x4f'           , // Fix bottom size
  LEFT:      '\x1b\x6c'           , // Fix left size
  RIGHT:     '\x1b\x51'           , // Fix right size
};

/**
 * [PAPER Paper]
 * @type {Object}
 */
_.PAPER = {
  PAPER_FULL_CUT  : '\x1d\x56\x00' , // Full cut paper
  PAPER_PART_CUT  : '\x1d\x56\x01' , // Partial cut paper
  PAPER_CUT_A     : '\x1d\x56\x41' , // Partial cut paper
  PAPER_CUT_B     : '\x1d\x56\x42' , // Partial cut paper
};

/**
 * [TEXT_FORMAT Text format]
 * @type {Object}
 */
_.TEXT_FORMAT = {

  TXT_NORMAL      : '\x1b\x21\x00', // Normal text
  TXT_2HEIGHT     : '\x1b\x21\x10', // Double height text
  TXT_2WIDTH      : '\x1b\x21\x20', // Double width text
  TXT_4SQUARE     : '\x1b\x21\x30', // Double width & height text

  TXT_SIZE        : '\x1d\x21', // other sizes
  TXT_HEIGHT      : {
    1: '\x00',
    2: '\x01',
    3: '\x02',
    4: '\x03',
    5: '\x04',
    6: '\x05',
    7: '\x06',
    8: '\x07'
  },
  TXT_WIDTH       : {
    1: '\x00',
    2: '\x10',
    3: '\x20',
    4: '\x30',
    5: '\x40',
    6: '\x50',
    7: '\x60',
    8: '\x70'
  },

  TXT_UNDERL_OFF  : '\x1b\x2d\x00', // Underline font OFF
  TXT_UNDERL_ON   : '\x1b\x2d\x01', // Underline font 1-dot ON
  TXT_UNDERL2_ON  : '\x1b\x2d\x02', // Underline font 2-dot ON
  TXT_BOLD_OFF    : '\x1b\x45\x00', // Bold font OFF
  TXT_BOLD_ON     : '\x1b\x45\x01', // Bold font ON
  TXT_ITALIC_OFF  : '\x1b\x35', // Italic font ON
  TXT_ITALIC_ON   : '\x1b\x34', // Italic font ON

  TXT_FONT_A      : '\x1b\x4d\x00', // Font type A
  TXT_FONT_B      : '\x1b\x4d\x01', // Font type B
  TXT_FONT_C      : '\x1b\x4d\x02', // Font type C

  TXT_ALIGN_LT    : '\x1b\x61\x00', // Left justification
  TXT_ALIGN_CT    : '\x1b\x61\x01', // Centering
  TXT_ALIGN_RT    : '\x1b\x61\x02', // Right justification
};

/**
 * [BARCODE_FORMAT Barcode format]
 * @type {Object}
 */
_.BARCODE_FORMAT = {
  BARCODE_TXT_OFF : '\x1d\x48\x00' , // HRI barcode chars OFF
  BARCODE_TXT_ABV : '\x1d\x48\x01' , // HRI barcode chars above
  BARCODE_TXT_BLW : '\x1d\x48\x02' , // HRI barcode chars below
  BARCODE_TXT_BTH : '\x1d\x48\x03' , // HRI barcode chars both above and below

  BARCODE_FONT_A  : '\x1d\x66\x00' , // Font type A for HRI barcode chars
  BARCODE_FONT_B  : '\x1d\x66\x01' , // Font type B for HRI barcode chars

  BARCODE_HEIGHT  : '\x1d\x68\x64' , // Barcode Height [1-255]
  BARCODE_WIDTH   : '\x1d\x77\x03' , // Barcode Width  [2-6]

  BARCODE_UPC_A   : '\x1d\x6b\x00' , // Barcode type UPC-A
  BARCODE_UPC_E   : '\x1d\x6b\x01' , // Barcode type UPC-E
  BARCODE_EAN13   : '\x1d\x6b\x02' , // Barcode type EAN13
  BARCODE_EAN8    : '\x1d\x6b\x03' , // Barcode type EAN8
  BARCODE_CODE39  : '\x1d\x6b\x04' , // Barcode type CODE39
  BARCODE_ITF     : '\x1d\x6b\x05' , // Barcode type ITF
  BARCODE_NW7     : '\x1d\x6b\x06' , // Barcode type NW7
  BARCODE_CODE93  : '\x1d\x6b\x07' , // Barcode type CODE93
  BARCODE_CODE128 : '\x1d\x6b\x08' , // Barcode type CODE128
};

/**
 * [CODE2D_FORMAT description]
 * @type {Object}
 */
_.CODE2D_FORMAT = {
  TYPE_PDF417     : _.GS  + 'Z' + '\x00',
  TYPE_DATAMATRIX : _.GS  + 'Z' + '\x01',
  TYPE_QR         : _.GS  + 'Z' + '\x02',
  CODE2D          : _.ESC + 'Z'         ,
  QR_LEVEL_L      : 'L', // correct level 7%
  QR_LEVEL_M      : 'M', // correct level 15%
  QR_LEVEL_Q      : 'Q', // correct level 25%
  QR_LEVEL_H      : 'H'  // correct level 30%
};

/**
 * [IMAGE_FORMAT Image format]
 * @type {Object}
 */
_.IMAGE_FORMAT = {
  S_RASTER_N      : '\x1d\x76\x30\x00' , // Set raster image normal size
  S_RASTER_2W     : '\x1d\x76\x30\x01' , // Set raster image double width
  S_RASTER_2H     : '\x1d\x76\x30\x02' , // Set raster image double height
  S_RASTER_Q      : '\x1d\x76\x30\x03' , // Set raster image quadruple
};

/**
 * [BITMAP_FORMAT description]
 * @type {Object}
 */
_.BITMAP_FORMAT = {
  BITMAP_S8     : '\x1b\x2a\x00',
  BITMAP_D8     : '\x1b\x2a\x01',
  BITMAP_S24    : '\x1b\x2a\x20',
  BITMAP_D24    : '\x1b\x2a\x21'
};

/**
 * [GSV0_FORMAT description]
 * @type {Object}
 */
_.GSV0_FORMAT = {
  GSV0_NORMAL   : '\x1d\x76\x30\x00',
  GSV0_DW       : '\x1d\x76\x30\x01',
  GSV0_DH       : '\x1d\x76\x30\x02',
  GSV0_DWDH     : '\x1d\x76\x30\x03'
};