'use strict';

// Load the Kanji data - Node.js caches this after first load
const kanjiData = require('./kanji_data.json');
const fetch = require('node-fetch');

const ITEMS_PER_PAGE = 20;

module.exports.queryKanji = async (event) => {
  console.log("Received queryKanji event:", JSON.stringify(event));

  try {
    // Safely get parameters, provide defaults
    const term = (event.pathParameters?.term && event.pathParameters.term !== '_')
        ? decodeURIComponent(event.pathParameters.term).toLowerCase()
        : ''; // The raw, potentially multi-word, lowercased search term
    const page = event.pathParameters?.page ? parseInt(event.pathParameters.page, 10) : 0;

    // Split the search term into individual words, removing empty strings
    const searchWords = term.split(' ').filter(word => word.length > 0);

    console.log(`Searching for words: [${searchWords.join(', ')}], page: ${page}`); // Log the words being searched

    let results = [];
    // If there are actual words to search for
    if (searchWords.length > 0) {
      results = kanjiData.filter(entry => {
        // Basic check for valid entry structure
        if (!entry) return false;

        // Check if *every* search word is present in the entry
        return searchWords.every(word => {
          // Check this 'word' against all relevant fields using OR (||)
          // Returns true if the 'word' is found in *any* field for this entry
          return (
            (entry.kanji && typeof entry.kanji === 'string' && entry.kanji.toLowerCase().includes(word)) ||
            (entry.palabra && typeof entry.palabra === 'string' && entry.palabra.toLowerCase().includes(word)) ||
            (entry.comp1 && typeof entry.comp1 === 'string' && entry.comp1.toLowerCase().includes(word)) ||
            (entry.comp2 && typeof entry.comp2 === 'string' && entry.comp2.toLowerCase().includes(word)) ||
            (entry.comp3 && typeof entry.comp3 === 'string' && entry.comp3.toLowerCase().includes(word)) ||
            (entry.comp4 && typeof entry.comp4 === 'string' && entry.comp4.toLowerCase().includes(word)) ||
            (entry.comp5 && typeof entry.comp5 === 'string' && entry.comp5.toLowerCase().includes(word)) ||
            (entry.comp6 && typeof entry.comp6 === 'string' && entry.comp6.toLowerCase().includes(word)) ||
            (entry.historia && typeof entry.historia === 'string' && entry.historia.toLowerCase().includes(word)) ||
            (entry.similares && typeof entry.similares === 'string' && entry.similares.toLowerCase().includes(word))
          );
        }); // End searchWords.every()
      }); // End kanjiData.filter()
    } else {
      // No search term provided (or only spaces), return all data (paginated)
      console.log("No valid search words, returning all data (paginated).");
      results = kanjiData; // Assign the full dataset
    }

    // --- Calculate Total Items based on filtered results ---
    const totalItems = Array.isArray(results) ? results.length : 0;
    console.log(`Found ${totalItems} matching entries before pagination.`);

    // --- Pagination ---
    const startIndex = page * ITEMS_PER_PAGE;
    const paginatedResults = Array.isArray(results) ? results.slice(startIndex, startIndex + ITEMS_PER_PAGE) : [];

    // Check if there are more pages
    const hasMore = totalItems > (startIndex + ITEMS_PER_PAGE);

    console.log(`Returning ${paginatedResults.length} results for page ${page}. HasMore: ${hasMore}. TotalItems: ${totalItems}`);

    // --- Return Response ---
    return {
      statusCode: 200,
      headers: {
          // It's good practice to include CORS headers even if handled by API Gateway,
          // especially if you might test differently later. API Gateway's setting
          // should take precedence if configured.
          'Access-Control-Allow-Origin': '*', // Or restrict to your frontend domain
          'Access-Control-Allow-Credentials': true, // If needed, though typically not for GET
      },
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
      headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
      },
      // Provide a generic error message to the client
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
}; // End module.exports.queryKanji

// --- Make sure the proxyJisho function is still here! ---
module.exports.proxyJisho = async (event) => {
    // ... (Keep your existing, working proxyJisho code here) ...
    console.log("Received proxyJisho event:", JSON.stringify(event));
    try {
        const term = event.pathParameters?.term ? encodeURIComponent(event.pathParameters.term) : '';
        if (!term) {
        console.log("Missing search term for Jisho proxy.");
        return { statusCode: 400, body: JSON.stringify({ message: 'Missing search term'}) };
        }

        const jishoUrl = `https://jisho.org/api/v1/search/words?keyword=${term}`;
        console.log(`Proxying request to: ${jishoUrl}`);

        const fetchOptions = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
            }
        };
        const response = await fetch(jishoUrl, fetchOptions);

        if (!response.ok) {
            console.error(`Jisho API error: ${response.status} ${response.statusText}`);
            const errorBody = await response.text().catch((err) => {
                console.error("Could not read error body from Jisho:", err);
                return 'Could not read error body';
            });
            console.error('Jisho error response body:', errorBody);
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    message: 'Error fetching from Jisho API',
                    jishoError: errorBody
                })
            };
        }

        const data = await response.json();
        console.log("Successfully received data from Jisho.");

        return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify(data), // Return Jisho's response directly
        };
    } catch (error) {
        console.error("Error in proxyJisho handler:", error);
        return {
        statusCode: 500,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ message: 'Internal Server Error proxying Jisho' }),
        };
    }
}; // End module.exports.proxyJisho