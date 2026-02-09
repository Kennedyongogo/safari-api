const fs = require("fs").promises;
const path = require("path");
const { PDFDocument } = require("pdf-lib-with-encrypt");

/**
 * Slug that should be stored as password-protected PDF (M-Pesa style).
 * Opening the file in any viewer will require the password.
 */
const PROTECTED_SLUGS = ["tra-license"];

/**
 * Check if a document slug should be encrypted with a password.
 * @param {string} slug - Document slug (e.g. "tra-license")
 * @returns {boolean}
 */
function shouldEncryptBySlug(slug) {
  if (!slug || typeof slug !== "string") return false;
  const normalized = slug.toLowerCase().trim();
  return PROTECTED_SLUGS.includes(normalized);
}

/**
 * Encrypt a PDF file with a user password (open password).
 * Overwrites the file with the encrypted version.
 * @param {string} absolutePath - Full path to the PDF file
 * @param {string} userPassword - Password required to open the PDF
 * @returns {Promise<void>}
 */
async function encryptPdfFile(absolutePath, userPassword) {
  if (!absolutePath || !userPassword) {
    throw new Error("encryptPdfFile requires absolutePath and userPassword");
  }

  const ext = path.extname(absolutePath).toLowerCase();
  if (ext !== ".pdf") {
    throw new Error("encryptPdfFile only supports .pdf files");
  }

  const bytes = await fs.readFile(absolutePath);
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });

  // pdf-lib-with-encrypt: save with user password (required to open the PDF)
  const encryptedBytes = await pdfDoc.save({
    userPassword,
  });

  await fs.writeFile(absolutePath, encryptedBytes);
}

module.exports = {
  shouldEncryptBySlug,
  encryptPdfFile,
  PROTECTED_SLUGS,
};
