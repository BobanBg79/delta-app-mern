// services/ai/VoiceReservationService.js
const OpenAI = require('openai');
const { toFile } = require('openai');
const Apartment = require('../../models/Apartment');
const BookingAgent = require('../../models/BookingAgent');
const {
  VALIDATION_PATTERNS,
  RESERVATION_REQUIRED_FIELDS,
} = require('../../constants/validation');

class VoiceReservationService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Transcribe audio using Whisper API
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} mimeType - MIME type of the audio
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(audioBuffer, mimeType) {
    try {
      // Convert buffer to file-like object for OpenAI API (Node.js compatible)
      const file = await toFile(audioBuffer, 'audio.webm', { type: mimeType });

      const transcription = await this.openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'sr', // Serbian
        response_format: 'text',
      });

      console.log('Whisper transcription result:', transcription);
      return transcription;
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw new Error('Failed to transcribe audio: ' + error.message);
    }
  }

  /**
   * Parse transcribed text into reservation data using Chat Completion
   * @param {string} transcribedText - Text from Whisper
   * @param {Object} context - Apartments and booking agents for reference
   * @returns {Promise<Object>} Parsed reservation data
   */
  async parseReservationFromText(transcribedText, context) {
    const { apartments, bookingAgents } = context;

    const systemPrompt = this.buildSystemPrompt(apartments, bookingAgents);
    const userPrompt = `Parse the following reservation from voice message:\n\n"${transcribedText}"`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Low temperature for consistent parsing
      });

      const parsedData = JSON.parse(completion.choices[0].message.content);
      return this.validateAndEnrichParsedData(
        parsedData,
        apartments,
        bookingAgents,
        transcribedText
      );
    } catch (error) {
      console.error('Chat Completion parsing error:', error);
      throw new Error('Failed to parse reservation: ' + error.message);
    }
  }

  /**
   * Build system prompt with context
   */
  buildSystemPrompt(apartments, bookingAgents) {
    const apartmentList = apartments
      .map((a) => `- "${a.name}" (ID: ${a._id})`)
      .join('\n');
    const agentList = bookingAgents
      .map((a) => `- "${a.name}" (ID: ${a._id})`)
      .join('\n');

    const phonePattern = VALIDATION_PATTERNS.PHONE.toString();
    const timePattern = VALIDATION_PATTERNS.TIME_HH_MM.toString();

    return `You are an assistant for parsing voice reservations for apartments.

AVAILABLE APARTMENTS:
${apartmentList || '(no apartments available)'}

AVAILABLE BOOKING AGENTS:
${agentList || '(no agents available)'}
- Direct reservation (no agent) - use null for bookingAgent

TODAY'S DATE: ${new Date().toISOString().split('T')[0]}

PARSING RULES:
1. Dates: Convert to ISO8601 format (YYYY-MM-DD). Handle relative dates:
   - "danas" / "tonight" / "večeras" / "od danas" → use TODAY's date for check-in
   - "sutra" / "tomorrow" → use tomorrow's date
   - "za [N] noći" / "[N] noći" → calculate check-out as check-in + N days
   - "jedna noć" = 1 night, "dve noći" = 2 nights, etc.
   - If only number of nights mentioned with "danas/večeras", check-in = today, check-out = today + nights
   - If year is not mentioned, use current year (${new Date().getFullYear()}).
2. Times: Convert to HH:MM format (24h). Pattern: ${timePattern}
3. Prices: Extract numbers, assume EUR if currency not mentioned.
4. Phone: Preserve original format. Must match pattern: ${phonePattern}
5. Apartment: Use FUZZY MATCHING - normalize names by removing spaces and lowercasing, then match (e.g., "Luna" matches "Luna", "jorgovan" matches "Jorgovan"). Always return the ID from the list if there's a reasonable match.
6. Agent: Use FUZZY MATCHING - normalize by removing spaces/punctuation and lowercasing before comparing. IMPORTANT: "Beo Apartman" → normalize to "beoapartman" → matches "beoapartman" in list. "Booking" matches "Booking". Always use the ID from the list when matched. If not mentioned at all, use null (direct reservation).
7. Guest name: Extract if mentioned, for reference only (not required for reservation).

RETURN JSON IN THE FOLLOWING FORMAT:
{
  "success": true,
  "confidence": "high" | "medium" | "low",
  "data": {
    "plannedCheckIn": "YYYY-MM-DD",
    "plannedCheckOut": "YYYY-MM-DD",
    "plannedArrivalTime": "HH:MM" | null,
    "plannedCheckoutTime": "HH:MM" | null,
    "apartment": "apartment_id or null if not recognized",
    "apartmentName": "name of recognized apartment",
    "phoneNumber": "phone number",
    "bookingAgent": "agent_id or null",
    "bookingAgentName": "agent name or 'Direct'",
    "pricePerNight": number,
    "totalAmount": number | null,
    "reservationNotes": "additional notes",
    "guestName": "guest name if mentioned"
  },
  "missingFields": ["list of missing required fields"],
  "warnings": ["list of warnings or uncertainties"]
}

If you cannot parse a required field, set it to null and add to missingFields.
Required fields: plannedCheckIn, plannedCheckOut, apartment, phoneNumber, pricePerNight`;
  }

  /**
   * Validate and enrich parsed data
   */
  validateAndEnrichParsedData(parsedData, apartments, bookingAgents, originalText) {
    const result = { ...parsedData };

    // Add original transcription
    result.originalTranscription = originalText;

    // Ensure data object exists
    if (!result.data) {
      result.data = {};
      result.success = false;
      result.missingFields = RESERVATION_REQUIRED_FIELDS;
      return result;
    }

    // Ensure arrays exist
    result.missingFields = result.missingFields || [];
    result.warnings = result.warnings || [];

    // Calculate totalAmount if not provided but pricePerNight and dates are
    if (
      result.data.pricePerNight &&
      result.data.plannedCheckIn &&
      result.data.plannedCheckOut &&
      !result.data.totalAmount
    ) {
      const checkIn = new Date(result.data.plannedCheckIn);
      const checkOut = new Date(result.data.plannedCheckOut);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

      if (nights > 0) {
        result.data.totalAmount = result.data.pricePerNight * nights;
        result.data.calculatedNights = nights;
      }
    }

    // Validate apartment ID exists
    if (result.data.apartment) {
      const apartmentExists = apartments.some(
        (a) => a._id.toString() === result.data.apartment
      );
      if (!apartmentExists) {
        result.data.apartment = null;
        if (!result.missingFields.includes('apartment')) {
          result.missingFields.push('apartment');
        }
        result.warnings.push('Apartment not recognized in system');
      }
    }

    // Validate booking agent ID exists
    if (result.data.bookingAgent) {
      const agentExists = bookingAgents.some(
        (a) => a._id.toString() === result.data.bookingAgent
      );
      if (!agentExists) {
        result.data.bookingAgent = null;
        result.warnings.push('Booking agent not recognized, set to Direct');
      }
    }

    // Check required fields
    for (const field of RESERVATION_REQUIRED_FIELDS) {
      if (!result.data[field] && !result.missingFields.includes(field)) {
        result.missingFields.push(field);
      }
    }

    // Set success based on missing required fields
    result.success = result.missingFields.length === 0;

    // Adjust confidence based on missing/warnings
    if (result.missingFields.length > 0) {
      result.confidence = 'low';
    } else if (result.warnings.length > 0) {
      result.confidence = result.confidence === 'high' ? 'medium' : result.confidence;
    }

    return result;
  }

  /**
   * Get context data (apartments and booking agents)
   */
  async getContext() {
    const [apartments, bookingAgents] = await Promise.all([
      Apartment.find({ isActive: true }).select('_id name').lean(),
      BookingAgent.find({ active: true }).select('_id name').lean(),
    ]);

    return { apartments, bookingAgents };
  }

  /**
   * Get MIME type from original filename or default
   */
  getMimeType(mimetype, filename) {
    if (mimetype) return mimetype;

    const ext = filename?.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      webm: 'audio/webm',
      m4a: 'audio/mp4',
      ogg: 'audio/ogg',
    };
    return mimeTypes[ext] || 'audio/webm';
  }

  /**
   * Main method: Process voice recording to reservation data
   * @param {Buffer} audioBuffer - Audio file buffer
   * @param {string} mimetype - MIME type
   * @param {string} filename - Original filename
   */
  async processVoiceRecording(audioBuffer, mimetype, filename) {
    // 1. Get context (apartments and booking agents)
    const context = await this.getContext();

    // 2. Get proper MIME type
    const mimeType = this.getMimeType(mimetype, filename);

    // 3. Transcribe audio
    const transcribedText = await this.transcribeAudio(audioBuffer, mimeType);

    if (!transcribedText || transcribedText.trim().length === 0) {
      throw new Error('Audio transcription returned empty text');
    }

    // 4. Parse to reservation data
    const parsedData = await this.parseReservationFromText(transcribedText, context);

    // 5. Add context for frontend (dropdown options)
    parsedData.context = {
      apartments: context.apartments,
      bookingAgents: context.bookingAgents,
    };

    return parsedData;
  }
}

module.exports = new VoiceReservationService();
