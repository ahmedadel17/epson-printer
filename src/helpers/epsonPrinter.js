import axios from 'axios'

/**
 * Epson ePOS-Print API helper functions
 * Uses HTTPS requests with XML format to communicate with Epson printers
 * Endpoint: https://<PRINTER_IP>/cgi-bin/epos/service.cgi?devid=local_print
 */

/**
 * Escape XML special characters
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
const escapeXml = (text) => {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Convert string to base64 (browser-compatible)
 * @param {string} str - String to convert
 * @returns {string} - Base64 string
 */
const stringToBase64 = (str) => {
  try {
    return btoa(unescape(encodeURIComponent(str)))
  } catch {
    // Fallback for older browsers
    return btoa(str)
  }
}

/**
 * Generate ePOS-Print XML for text printing
 * @param {string} text - Text to print
 * @param {object} options - Formatting options
 * @returns {string} - XML string
 */
export const generateEposXml = (text, options = {}) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">\n'
  
  // Set alignment
  if (options.align === 'center') {
    xml += '  <text lang="en" align="center">'
  } else if (options.align === 'right') {
    xml += '  <text lang="en" align="right">'
  } else {
    xml += '  <text lang="en">'
  }
  
  // Set text style
  if (options.bold) {
    xml = xml.replace('>', ' bold="true">')
  }
  
  if (options.doubleWidth || options.doubleHeight) {
    let width = options.doubleWidth ? '2' : '1'
    let height = options.doubleHeight ? '2' : '1'
    xml = xml.replace('>', ` width="${width}" height="${height}">`)
  }
  
  // Add text content
  xml += escapeXml(text)
  xml += '</text>\n'
  
  // Add line feed
  if (options.feed !== false) {
    xml += '  <feed />\n'
  }
  
  // Cut paper
  if (options.cut) {
    xml += '  <cut type="partial" />\n'
  }
  
  xml += '</epos-print>'
  return xml
}

/**
 * Generate ePOS-Print XML for receipt printing
 * @param {object} receiptData - Receipt data object
 * @returns {string} - XML string
 */
export const generateReceiptXml = (receiptData) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xml += '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">\n'
  
  // Header
  if (receiptData.header) {
    xml += '  <text lang="en" align="center" width="2" height="2">'
    xml += escapeXml(receiptData.header)
    xml += '</text>\n'
    xml += '  <feed />\n'
  }
  
  // Items
  if (receiptData.items && receiptData.items.length > 0) {
    receiptData.items.forEach(item => {
      xml += '  <text lang="en">'
      xml += escapeXml(`${item.name || ''} ${item.price || ''}`)
      xml += '</text>\n'
    })
    xml += '  <feed />\n'
  }
  
  // Total
  if (receiptData.total) {
    xml += '  <text lang="en" bold="true">'
    xml += escapeXml(`Total: ${receiptData.total}`)
    xml += '</text>\n'
    xml += '  <feed />\n'
  }
  
  // Footer
  if (receiptData.footer) {
    xml += '  <text lang="en" align="center">'
    xml += escapeXml(receiptData.footer)
    xml += '</text>\n'
    xml += '  <feed />\n'
  }
  
  // Cut paper
  xml += '  <cut type="partial" />\n'
  xml += '</epos-print>'
  
  return xml
}

/**
 * Print to Epson printer via HTTPS using ePOS-Print XML API
 * @param {string} printerIp - Printer IP address
 * @param {number} port - Printer port (usually 443 or 8008 for HTTPS)
 * @param {string} xmlData - XML string to print
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Response from printer
 */
export const printToEpson = async (printerIp, port = 443, xmlData, options = {}) => {
  try {
    // Validate inputs
    if (!printerIp) {
      throw new Error('Printer IP address is required')
    }
    
    if (!xmlData || typeof xmlData !== 'string') {
      throw new Error('XML data must be a string')
    }
    
    // Build the URL with correct endpoint
    const baseUrl = `https://${printerIp}:${port}`
    const apiPath = options.apiPath || '/cgi-bin/epos/service.cgi'
    const devid = options.devid || 'local_print'
    const url = `${baseUrl}${apiPath}?devid=${devid}`
    
    // Prepare request options
    const requestOptions = {
      method: 'POST',
      url: url,
      headers: {
        'Content-Type': 'text/xml',
        ...(options.headers || {})
      },
      data: xmlData,
      responseType: 'text',
      timeout: options.timeout || 10000
    }
    
    // Add authentication if provided
    if (options.username && options.password) {
      const authString = `${options.username}:${options.password}`
      const auth = stringToBase64(authString)
      requestOptions.headers['Authorization'] = `Basic ${auth}`
    }
    
    // Make the HTTPS request
    const response = await axios(requestOptions)
    
    return {
      success: true,
      status: response.status,
      data: response.data,
      message: 'Print job sent successfully'
    }
  } catch (error) {
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const errorMsg = error.response.data || error.response.statusText
      throw new Error(`Printer responded with error: ${error.response.status} - ${errorMsg}`)
    } else if (error.request) {
      // Request was made but no response received
      throw new Error(`No response from printer. Check IP address (${printerIp}:${port}) and network connection. Make sure ePOS-Print is enabled on the printer.`)
    } else {
      // Error in request setup
      throw new Error(`Print request failed: ${error.message}`)
    }
  }
}

/**
 * Print text to Epson printer (simplified function)
 * @param {string} printerIp - Printer IP address
 * @param {number} port - Printer port
 * @param {string} text - Text to print
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Response from printer
 */
export const printTextToEpson = async (printerIp, port = 443, text, options = {}) => {
  const xml = generateEposXml(text, {
    align: options.align || 'left',
    bold: options.bold || false,
    doubleWidth: options.doubleWidth || false,
    doubleHeight: options.doubleHeight || false,
    cut: options.cut || false,
    feed: options.feed !== false
  })
  
  return printToEpson(printerIp, port, xml, options)
}

/**
 * Test connection to Epson printer
 * @param {string} printerIp - Printer IP address
 * @param {number} port - Printer port
 * @param {object} options - Additional options
 * @returns {Promise<boolean>} - Connection success status
 */
export const testEpsonConnection = async (printerIp, port = 443, options = {}) => {
  try {
    // Try to print a minimal test XML
    const testXml = '<?xml version="1.0" encoding="UTF-8"?>\n<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print"><text lang="en">Test</text><feed /></epos-print>'
    
    await printToEpson(printerIp, port, testXml, {
      ...options,
      timeout: options.timeout || 5000
    })
    
    return true
  } catch (error) {
    // If we get a network error, the printer might not be reachable
    // But if we get any response, it means the printer is there
    if (error.response) {
      return true // Printer responded (even with error)
    }
    return false // No response from printer
  }
}

/**
 * Print receipt to Epson printer
 * @param {string} printerIp - Printer IP address
 * @param {number} port - Printer port
 * @param {object} receiptData - Receipt data object
 * @param {object} options - Additional options
 * @returns {Promise<object>} - Response from printer
 */
export const printReceiptToEpson = async (printerIp, port = 443, receiptData, options = {}) => {
  const xml = generateReceiptXml(receiptData)
  return printToEpson(printerIp, port, xml, options)
}
