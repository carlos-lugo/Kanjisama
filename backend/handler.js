'use strict';

// Load the Kanji data - Node.js caches this after first load
const kanjiData = require('./kanji_data.json');
const fetch = require('node-fetch');

const ITEMS_PER_PAGE = 20;

module.exports.queryKanji = async (event) => {
  console.log("Received queryKanji event:", JSON.stringify(event)); // Add logging

  try {
    // Safely get parameters, provide defaults
    const term = (event.pathParameters?.term && event.pathParameters.term !== '_') ? decodeURIComponent(event.pathParameters.term).toLowerCase() : '';
    const page = event.pathParameters?.page ? parseInt(event.pathParameters.page, 10) : 0;

    console.log(`Searching for term: "${term}", page: ${page}`); // Log search parameters

    let results = [];
    if (term) {
      results = kanjiData.filter(entry => {
        // Check if entry exists and then check fields safely
        if (!entry) return false;
        return (
          (entry.kanji && typeof entry.kanji === 'string' && entry.kanji.toLowerCase().includes(term)) ||
          (entry.palabra && typeof entry.palabra === 'string' && entry.palabra.toLowerCase().includes(term)) ||
          (entry.comp1 && typeof entry.comp1 === 'string' && entry.comp1.toLowerCase().includes(term)) ||
          (entry.comp2 && typeof entry.comp2 === 'string' && entry.comp2.toLowerCase().includes(term)) ||
          (entry.comp3 && typeof entry.comp3 === 'string' && entry.comp3.toLowerCase().includes(term)) ||
          (entry.comp4 && typeof entry.comp4 === 'string' && entry.comp4.toLowerCase().includes(term)) ||
          (entry.comp5 && typeof entry.comp5 === 'string' && entry.comp5.toLowerCase().includes(term)) ||
          (entry.comp6 && typeof entry.comp6 === 'string' && entry.comp6.toLowerCase().includes(term)) ||
          (entry.historia && typeof entry.historia === 'string' && entry.historia.toLowerCase().includes(term)) ||
          (entry.similares && typeof entry.similares === 'string' && entry.similares.toLowerCase().includes(term))
        );
      });
    } else {
      // Return all data if no search term
      console.log("No search term, returning all data (paginated).");
      results = kanjiData;
    }

    // --- Calculate Total Items ---
    const totalItems = Array.isArray(results) ? results.length : 0;
    console.log(`Found ${totalItems} matching entries before pagination.`); // Log count

    const startIndex = page * ITEMS_PER_PAGE;
    // Add check for valid startIndex and results array
    const paginatedResults = Array.isArray(results) ? results.slice(startIndex, startIndex + ITEMS_PER_PAGE) : [];

    // Check if there are more pages
    const hasMore = totalItems > (startIndex + ITEMS_PER_PAGE);

    console.log(`Returning ${paginatedResults.length} results for page ${page}. HasMore: ${hasMore}. TotalItems: ${totalItems}`); // Log return info

    return {
      statusCode: 200,
      body: JSON.stringify({
          data: paginatedResults,
          hasMore: hasMore,
          currentPage: page,
          totalItems: totalItems
      }),
    };
  } catch (error) {
    // Log the detailed error to CloudWatch
    console.error("Error in queryKanji handler:", error);
    return {
      statusCode: 500,
      // Provide a generic error message to the client
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};

// --- proxyJisho function remains the same ---
module.exports.proxyJisho = async (event) => {
  console.log("Received proxyJisho event:", JSON.stringify(event)); // Add logging
  try {
    const term = event.pathParameters?.term ? encodeURIComponent(event.pathParameters.term) : '';
    if (!term) {
      console.log("Missing search term for Jisho proxy.");
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing search term'}) };
    }

    const jishoUrl = `https://jisho.org/api/v1/search/words?keyword=${term}`;
    console.log(`Proxying request to: ${jishoUrl}`); // Log Jisho URL
    const fetchOptions = {
      headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
          // Using a realistic browser User-Agent string
      }
    };
    const response = await fetch(jishoUrl, fetchOptions); // Pass options to fetch

    if (!response.ok) {
      console.error(`Jisho API error: ${response.status} ${response.statusText}`);
      // Try to read response body for more details if possible
      const errorBody = await response.text().catch(() => 'Could not read error body');
      console.error('Jisho error response body:', errorBody);
      return { statusCode: response.status, body: JSON.stringify({ message: 'Error fetching from Jisho API'}) };
    }

    const data = await response.json();
    console.log("Successfully received data from Jisho."); // Log success

    return {
      statusCode: 200,
      body: JSON.stringify(data), // Return Jisho's response directly
    };
  } catch (error) {
    console.error("Error in proxyJisho handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error proxying Jisho' }),
    };
  }
};
