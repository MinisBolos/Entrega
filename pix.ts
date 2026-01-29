
// Helper to calculate CRC16 (CCITT-FALSE) required by Pix
function getCRC16(payload: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
  }

  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

// Format field with ID + Length + Value
function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export const generatePixString = (
  key: string,
  name: string,
  city: string = 'SAO PAULO',
  amount?: number,
  txId: string = '***' // Default transaction ID
): string => {
  // Clean inputs
  const cleanKey = key.trim();
  const cleanName = name.substring(0, 25).trim(); // Max 25 chars
  const cleanCity = city.substring(0, 15).trim(); // Max 15 chars

  // 00 - Payload Format Indicator
  let payload = formatField('00', '01');

  // 26 - Merchant Account Information
  // 00 - GUI (BR.GOV.BCB.PIX)
  // 01 - Key
  const merchantAccount = formatField('00', 'BR.GOV.BCB.PIX') + formatField('01', cleanKey);
  payload += formatField('26', merchantAccount);

  // 52 - Merchant Category Code (0000 = General)
  payload += formatField('52', '0000');

  // 53 - Transaction Currency (986 = BRL)
  payload += formatField('53', '986');

  // 54 - Transaction Amount (Optional)
  if (amount && amount > 0) {
    payload += formatField('54', amount.toFixed(2));
  }

  // 58 - Country Code
  payload += formatField('58', 'BR');

  // 59 - Merchant Name
  payload += formatField('59', cleanName);

  // 60 - Merchant City
  payload += formatField('60', cleanCity);

  // 62 - Additional Data Field (TxID)
  // 05 - Reference Label
  const additionalData = formatField('05', txId);
  payload += formatField('62', additionalData);

  // 63 - CRC16
  payload += '6304'; // ID + Length for CRC
  
  // Calculate CRC
  const crc = getCRC16(payload);
  
  return payload + crc;
};