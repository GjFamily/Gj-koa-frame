import PDFDocument from 'pdfkit';
// import path from 'path';
import fs from 'fs';
import download from './download';
// import blobStream from 'blob-stream';

export default PDFDocument;

export const stream = function (doc, file) {
  // return doc.pipe(blobStream());
  return doc.pipe(fs.createWriteStream(file));
};

export const width = 612;
export const margin = 72;
export const height = 792;

export const generate = function (doc, file) {
  return new Promise((resolve) => {
    let s = stream(doc, file);
    s.on('close', () => {
      resolve();
    });
  });
};

export const pageFoot = function (doc, cb) {
  let range = doc.bufferedPageRange();
  for (let index = range.start; index < range.count; index++) {
    doc.switchToPage(index);
    // .margins.bottom -= h;
    // doc.text('', height - margin);
    cb(doc, index + 1);
  }
  doc.flushPages();
};

// def first_page(self,canvas, doc):
// canvas.saveState()
// logo = os.path.join(image_path,'%s.png'%self.for_web)
// canvas.drawImage(logo,inch,PAGE_HEIGHT-inch,100,30)
// canvas.line(inch,PAGE_HEIGHT-inch,PAGE_WIDTH-inch,PAGE_HEIGHT-inch)

// canvas.setFont('simhei',16)
// canvas.drawCentredString(PAGE_WIDTH/2.0, PAGE_HEIGHT-108, Title)

// canvas.setFont('simhei',9)
// canvas.drawString(inch, 0.75 * inch, u"第%d页" % doc.page)
// canvas.restoreState()

// def later_pages(self,canvas, doc):
// canvas.saveState()
// canvas.setFont('simhei',9)
// canvas.drawString(inch, 0.75 * inch, u"第%d页" % doc.page)

// gif = os.path.join(image_path,'%s.png'%self.for_web)
// canvas.drawImage(gif,inch,PAGE_HEIGHT-inch,100,30)
// canvas.line(inch,PAGE_HEIGHT-inch,PAGE_WIDTH-inch,PAGE_HEIGHT-inch)
// canvas.restoreState()
export const middleware = function* (next) {
  // create a document and pipe to a blob
  let doc = new PDFDocument({
    autoFirstPage: false,
    bufferPages: true,
    title: '论文查重报告简明打印版',
    author: 'Write Pass',
  });
  let s = generate(doc, 'test.pdf');
  doc.registerFont('simhei', 'font/simhei.ttf');

  doc.on('pageAdded', () => {
    doc.image('./logo.png', { height: 30 });
    doc.moveDown();
    doc.lineWidth(1)
      .moveTo(margin, margin + 32)
      .lineTo(width - margin, margin + 32)
      // .moveTo(72, 110)
      // .lineTo(530, 110)
      .stroke();
    doc.moveDown(2);
  });
  doc.addPage();
  doc.font('simhei', 16)
    .fillColor('black')
    .text('论文查重报告简明打印版', {
      align: 'center',
      height: 108,
    })
    .moveDown(2);
  // draw some text
  doc.font('simhei', 9)
    .fillColor('black')
    .text('原文段落')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('red')
    .text('汪曾棋的家乡不仅有带给了他深厚的传统文化，还有画一样的水乡圣境,。名胜古迹文游台、镇国寺 等。文游台是秦少游、苏东坡、孙萃老、王定国文酒游会之所。随处可见的名胜古迹,厚重的历史, 浓郁醇厚的习俗风尚深深陶冶了汪曾棋的性情。生于斯长于斯,汪曾棋对故乡高邮的乡土人情、风俗 非常熟悉。高邮的民居、人们的穿着打扮、处世方式、思维习惯、生活习惯以及婚丧嫁娶、话语的 表达方式,都无不受他的故乡社会习俗的影响,这对他日后的创作产生了深刻的影响。')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('red')
    .text('汪曾棋的家乡不仅有带给了他深厚的传统文化，还有画一样的水乡圣境,。名胜古迹文游台、镇国寺 等。文游台是秦少游、苏东坡、孙萃老、王定国文酒游会之所。随处可见的名胜古迹,厚重的历史, 浓郁醇厚的习俗风尚深深陶冶了汪曾棋的性情。生于斯长于斯,汪曾棋对故乡高邮的乡土人情、风俗 非常熟悉。高邮的民居、人们的穿着打扮、处世方式、思维习惯、生活习惯以及婚丧嫁娶、话语的 表达方式,都无不受他的故乡社会习俗的影响,这对他日后的创作产生了深刻的影响。')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('red')
    .text('汪曾棋的家乡不仅有带给了他深厚的传统文化，还有画一样的水乡圣境,。名胜古迹文游台、镇国寺 等。文游台是秦少游、苏东坡、孙萃老、王定国文酒游会之所。随处可见的名胜古迹,厚重的历史, 浓郁醇厚的习俗风尚深深陶冶了汪曾棋的性情。生于斯长于斯,汪曾棋对故乡高邮的乡土人情、风俗 非常熟悉。高邮的民居、人们的穿着打扮、处世方式、思维习惯、生活习惯以及婚丧嫁娶、话语的 表达方式,都无不受他的故乡社会习俗的影响,这对他日后的创作产生了深刻的影响。')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('red')
    .text('汪曾棋的家乡不仅有带给了他深厚的传统文化，还有画一样的水乡圣境,。名胜古迹文游台、镇国寺 等。文游台是秦少游、苏东坡、孙萃老、王定国文酒游会之所。随处可见的名胜古迹,厚重的历史, 浓郁醇厚的习俗风尚深深陶冶了汪曾棋的性情。生于斯长于斯,汪曾棋对故乡高邮的乡土人情、风俗 非常熟悉。高邮的民居、人们的穿着打扮、处世方式、思维习惯、生活习惯以及婚丧嫁娶、话语的 表达方式,都无不受他的故乡社会习俗的影响,这对他日后的创作产生了深刻的影响。')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('red')
    .text('汪曾棋的家乡不仅有带给了他深厚的传统文化，还有画一样的水乡圣境,。名胜古迹文游台、镇国寺 等。文游台是秦少游、苏东坡、孙萃老、王定国文酒游会之所。随处可见的名胜古迹,厚重的历史, 浓郁醇厚的习俗风尚深深陶冶了汪曾棋的性情。生于斯长于斯,汪曾棋对故乡高邮的乡土人情、风俗 非常熟悉。高邮的民居、人们的穿着打扮、处世方式、思维习惯、生活习惯以及婚丧嫁娶、话语的 表达方式,都无不受他的故乡社会习俗的影响,这对他日后的创作产生了深刻的影响。')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('red')
    .text('汪曾棋的家乡不仅有带给了他深厚的传统文化，还有画一样的水乡圣境,。名胜古迹文游台、镇国寺 等。文游台是秦少游、苏东坡、孙萃老、王定国文酒游会之所。随处可见的名胜古迹,厚重的历史, 浓郁醇厚的习俗风尚深深陶冶了汪曾棋的性情。生于斯长于斯,汪曾棋对故乡高邮的乡土人情、风俗 非常熟悉。高邮的民居、人们的穿着打扮、处世方式、思维习惯、生活习惯以及婚丧嫁娶、话语的 表达方式,都无不受他的故乡社会习俗的影响,这对他日后的创作产生了深刻的影响。')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('red')
    .text('汪曾棋的家乡不仅有带给了他深厚的传统文化，还有画一样的水乡圣境,。名胜古迹文游台、镇国寺 等。文游台是秦少游、苏东坡、孙萃老、王定国文酒游会之所。随处可见的名胜古迹,厚重的历史, 浓郁醇厚的习俗风尚深深陶冶了汪曾棋的性情。生于斯长于斯,汪曾棋对故乡高邮的乡土人情、风俗 非常熟悉。高邮的民居、人们的穿着打扮、处世方式、思维习惯、生活习惯以及婚丧嫁娶、话语的 表达方式,都无不受他的故乡社会习俗的影响,这对他日后的创作产生了深刻的影响。')
    .moveDown();

  doc.moveDown();

  doc.font('simhei', 9)
    .fillColor('black')
    .text('降重结果')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('green')
    .text('汪曾棋的故乡不仅给他带来了深厚的传统文化，也画出了同样的水环境。文物台，振国寺等名胜古 迹。文友泰是秦少优，苏东坡，孙翠老和王鼎国葡萄酒旅游俱乐部将参观的地方。浓浓的历史气息 ，丰富而醇厚的风俗习惯，深刻地培养了王宗奇的气质。汪曾祺出生于四龙余寺，对家乡高邮的乡 土习俗非常熟悉。高邮的房屋，人的衣着，生活方式，思维习惯，生活习惯，婚姻丧葬，言论表达 等都不受家乡的社会习俗的影响，这对他未来的创作产生了深远的影响')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('green')
    .text('汪曾棋的故乡不仅给他带来了深厚的传统文化，也画出了同样的水环境。文物台，振国寺等名胜古 迹。文友泰是秦少优，苏东坡，孙翠老和王鼎国葡萄酒旅游俱乐部将参观的地方。浓浓的历史气息 ，丰富而醇厚的风俗习惯，深刻地培养了王宗奇的气质。汪曾祺出生于四龙余寺，对家乡高邮的乡 土习俗非常熟悉。高邮的房屋，人的衣着，生活方式，思维习惯，生活习惯，婚姻丧葬，言论表达 等都不受家乡的社会习俗的影响，这对他未来的创作产生了深远的影响')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('green')
    .text('汪曾棋的故乡不仅给他带来了深厚的传统文化，也画出了同样的水环境。文物台，振国寺等名胜古 迹。文友泰是秦少优，苏东坡，孙翠老和王鼎国葡萄酒旅游俱乐部将参观的地方。浓浓的历史气息 ，丰富而醇厚的风俗习惯，深刻地培养了王宗奇的气质。汪曾祺出生于四龙余寺，对家乡高邮的乡 土习俗非常熟悉。高邮的房屋，人的衣着，生活方式，思维习惯，生活习惯，婚姻丧葬，言论表达 等都不受家乡的社会习俗的影响，这对他未来的创作产生了深远的影响')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('green')
    .text('汪曾棋的故乡不仅给他带来了深厚的传统文化，也画出了同样的水环境。文物台，振国寺等名胜古 迹。文友泰是秦少优，苏东坡，孙翠老和王鼎国葡萄酒旅游俱乐部将参观的地方。浓浓的历史气息 ，丰富而醇厚的风俗习惯，深刻地培养了王宗奇的气质。汪曾祺出生于四龙余寺，对家乡高邮的乡 土习俗非常熟悉。高邮的房屋，人的衣着，生活方式，思维习惯，生活习惯，婚姻丧葬，言论表达 等都不受家乡的社会习俗的影响，这对他未来的创作产生了深远的影响')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('green')
    .text('汪曾棋的故乡不仅给他带来了深厚的传统文化，也画出了同样的水环境。文物台，振国寺等名胜古 迹。文友泰是秦少优，苏东坡，孙翠老和王鼎国葡萄酒旅游俱乐部将参观的地方。浓浓的历史气息 ，丰富而醇厚的风俗习惯，深刻地培养了王宗奇的气质。汪曾祺出生于四龙余寺，对家乡高邮的乡 土习俗非常熟悉。高邮的房屋，人的衣着，生活方式，思维习惯，生活习惯，婚姻丧葬，言论表达 等都不受家乡的社会习俗的影响，这对他未来的创作产生了深远的影响')
    .moveDown();
  doc.font('simhei', 9)
    .fillColor('green')
    .text('汪曾棋的故乡不仅给他带来了深厚的传统文化，也画出了同样的水环境。文物台，振国寺等名胜古 迹。文友泰是秦少优，苏东坡，孙翠老和王鼎国葡萄酒旅游俱乐部将参观的地方。浓浓的历史气息 ，丰富而醇厚的风俗习惯，深刻地培养了王宗奇的气质。汪曾祺出生于四龙余寺，对家乡高邮的乡 土习俗非常熟悉。高邮的房屋，人的衣着，生活方式，思维习惯，生活习惯，婚姻丧葬，言论表达 等都不受家乡的社会习俗的影响，这对他未来的创作产生了深远的影响')
    .moveDown();
  // some vector graphics
  // doc.save()
  //   .moveTo(100, 150)
  //   .lineTo(100, 250)
  //   .lineTo(200, 250)
  //   .fill('#FF3300');

  // and some justified text wrapped into columns
  // doc.text('And here is some wrapped text...', 100, 300)
  //   .font('Times-Roman', 13)
  //   .moveDown()
  //   .text('123123', {
  //     width: 412,
  //     align: 'justify',
  //     indent: 30,
  //     columns: 2,
  //     height: 300,
  //     ellipsis: true,
  //   });
  // end and display the document in the iframe to the right
  pageFoot(doc, (d, page) => {
    d.font('simhei', 9)
      .fillColor('black')
      .text(`第${page}页`, margin, height - margin, {
        height: 9,
      });
  });

  doc.end();
  yield s;
  yield next;
  yield download.call(this, { file: 'test.pdf' });
};
