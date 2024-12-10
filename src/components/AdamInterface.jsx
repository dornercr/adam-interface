import React, { useState, useEffect } from 'react';
import {
    Search,
    Book,
    Globe,
    ChevronLeft,
    ChevronRight,
    Moon,
    Sun,
    Sliders
} from 'lucide-react';
import Papa from 'papaparse';

export default function AdamInterface() {
    // State declarations
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [articles, setArticles] = useState([]);
    const [filteredArticles, setFilteredArticles] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [languages, setLanguages] = useState([]);
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [searchTopic, setSearchTopic] = useState('');
    const [selectedIlrLevel, setSelectedIlrLevel] = useState('');
    const [ilrLevels, setIlrLevels] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [lowRange, setLowRange] = useState('');
    const [highRange, setHighRange] = useState('');

    const resultsPerPage = 50;

    useEffect(() => {
        loadAvailableLanguages();
        checkDarkModePreference();
    }, []);

    // Load available languages from JSON
    const loadAvailableLanguages = async () => {
        try {
            const response = await fetch('/data/available_files.json'); // Change as needed
            const availableFiles = await response.json();
            const langs = Object.keys(availableFiles);
            setLanguages(langs);
        } catch (error) {
            console.error("Error loading languages:", error);
        }
    };

    // Check and set dark mode from localStorage
    const checkDarkModePreference = () => {
        if (localStorage.getItem('darkMode') === 'true') {
            setIsDarkMode(true);
        }
    };

    const toggleDarkMode = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        localStorage.setItem('darkMode', newMode.toString());
    };

    // Load language data from CSV files
    const loadLanguageData = async (language) => {
        if (!language) return;

        setIsLoading(true);
        try {
            const response = await fetch('/data/available_files.json'); // Change as needed
            const availableFiles = await response.json();
            const languageFiles = availableFiles[language];

            if (!languageFiles || languageFiles.length === 0) {
                throw new Error(`No files found for ${language}`);
            }

            const results = await Promise.all(
                languageFiles.map(async (csvFile) => {
                    const resp = await fetch(`/data/${csvFile}`);
                    const text = await resp.text();
                    return new Promise((resolve) => {
                        Papa.parse(text, {
                            header: true,
                            complete: (parsedResults) => resolve(parsedResults.data),
                        });
                    });
                })
            );

            const allArticles = results.flat();
            setArticles(allArticles);

            // Populate ILR levels
            const ilrSet = new Set(allArticles.map(a => a.ilr_quantized).filter(Boolean));
            const ilrSorted = Array.from(ilrSet).sort((a,b) => parseInt(a)-parseInt(b));
            setIlrLevels(ilrSorted.length > 0 ? ilrSorted : ['1','2','3','4','5']);

            // Default ILR level (if available)
            const defaultLevel = ilrSorted.includes('1') ? '1' : '';
            setSelectedIlrLevel(defaultLevel);

            // Perform initial search
            searchArticles(allArticles, searchTopic, defaultLevel, lowRange, highRange);
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter articles based on the provided criteria
    const searchArticles = (
        articlesList = articles,
        topic = searchTopic,
        ilr = selectedIlrLevel,
        low = lowRange,
        high = highRange
    ) => {
        const filtered = articlesList.filter(article => {
            const titleMatch = article.title?.toLowerCase().includes(topic.toLowerCase());
            const summaryMatch = article.summary?.toLowerCase().includes(topic.toLowerCase());
            const translatedSummaryMatch = article.translated_summary?.toLowerCase().includes(topic.toLowerCase());
            const ilrMatch = !ilr || article.ilr_quantized === ilr;

            let rangeMatch = true;
            if (article.ilr_range && (low || high)) {
                try {
                    const parsedRange = JSON.parse(article.ilr_range.replace(/'/g, '"'));
                    if (Array.isArray(parsedRange)) {
                        const [rangeLow, rangeHigh] = parsedRange.map(Number);
                        if (low && rangeLow < Number(low)) rangeMatch = false;
                        if (high && rangeHigh > Number(high)) rangeMatch = false;
                    }
                } catch (err) {
                    console.error("Error parsing ilr_range:", err);
                    rangeMatch = false;
                }
            }

            return (topic === '' || titleMatch || summaryMatch || translatedSummaryMatch) &&
                ilrMatch &&
                rangeMatch;
        });

        setFilteredArticles(filtered);
        setCurrentPage(1);
    };

    // Change page for pagination
    const changePage = (delta) => {
        const newPage = currentPage + delta;
        const totalPages = Math.ceil(filteredArticles.length / resultsPerPage);
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    // Get articles for the current page
    const getCurrentPageArticles = () => {
        const startIndex = (currentPage - 1) * resultsPerPage;
        return filteredArticles.slice(startIndex, startIndex + resultsPerPage);
    };

    // Render an individual article card, including translated summary and ILR range
    const renderArticleCard = (article) => {
        const isRTL = /[\u0600-\u06FF]/.test(article.title || '') || /[\u0600-\u06FF]/.test(article.summary || '') || /[\u0600-\u06FF]/.test(article.translated_summary || '');
        const isCJK = /[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff]/.test(article.title || '');

        let ilrRangeDisplay = 'N/A';

        if (article.ilr_range && typeof article.ilr_range === 'string') {
            try {
                const parsedRange = JSON.parse(article.ilr_range.replace(/'/g, '"'));
                if (Array.isArray(parsedRange)) {
                    const [rangeLow, rangeHigh] = parsedRange.map(Number);
                    ilrRangeDisplay = `[${rangeLow.toFixed(2)}, ${rangeHigh.toFixed(2)}]`;
                }
            } catch (err) {
                console.error("Error parsing ilr_range:", err);
            }
        }

        return (
            <div key={article.id} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-4`}>
                <div className="flex justify-between items-start mb-3 w-full">
                    <div className="flex-shrink-0">
                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full whitespace-nowrap">
                            ILR {article.ilr_quantized || 'N/A'}
                        </span>
                    </div>
                    <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} flex-shrink-0`}>
                        {selectedLanguage}
                    </span>
                </div>

                <div className={`w-full ${isRTL ? 'rtl' : 'ltr'}`}>
                    <h3
                        className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}
                        ${isCJK ? 'tracking-normal leading-relaxed' : 'leading-normal'}`}
                        style={{
                            textAlign: isRTL ? 'right' : 'left',
                            direction: isRTL ? 'rtl' : 'ltr',
                        }}>
                        {article.title}
                    </h3>
                </div>

                <div className={`w-full ${isRTL ? 'rtl' : 'ltr'}`}>
                    <p
                        className={`text-sm mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}
                        ${isCJK ? 'tracking-normal leading-relaxed' : 'leading-normal'}`}
                        style={{
                            textAlign: isRTL ? 'right' : 'left',
                            direction: isRTL ? 'rtl' : 'ltr',
                        }}>
                        {article.summary || 'No summary available'}
                    </p>
                </div>

                {/* ILR Range */}
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                    <strong>ILR Range:</strong> {ilrRangeDisplay}
                </p>

                {/* Translated Summary */}
                <div className="mt-3">
                    <h6 className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        Translated Summary
                    </h6>
                    <p
                        className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}
                        ${isCJK ? 'tracking-normal leading-relaxed' : 'leading-normal'}`}
                        style={{
                            textAlign: isRTL ? 'right' : 'left',
                            direction: isRTL ? 'rtl' : 'ltr',
                        }}>
                        {article.translated_summary || 'No translated summary available'}
                    </p>
                </div>

                <div className="flex space-x-2 mt-4">
                    {article.link && (
                        <a
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                            Read More
                        </a>
                    )}
                    <button
                        className={`px-3 py-1 text-sm border rounded ${
                            isDarkMode
                                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        Save
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            {/* Navigation Bar */}
            <nav className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-b shadow-sm`}>
                <div className="container mx-auto px-4">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-3">
                            <Book className="w-8 h-8 text-blue-600" />
                            <div>
                                <span
                                    className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    ADAM
                                </span>
                                <span
                                    className={`hidden md:inline-block ml-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    Automated Detection of Authentic Material
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={toggleDarkMode}
                            className={`p-2 rounded-full ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        >
                            {isDarkMode ? (
                                <Sun className="w-5 h-5 text-gray-300" />
                            ) : (
                                <Moon className="w-5 h-5 text-gray-600" />
                            )}
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Filters Panel */}
                    <div className="lg:w-1/4 shrink-0">
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-4`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <Sliders className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                                    <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                        Search Filters
                                    </h2>
                                </div>
                                <button
                                    onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                                    className="lg:hidden"
                                >
                                    {isFilterExpanded ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                </button>
                            </div>

                            <div className={`space-y-4 ${isFilterExpanded ? 'block' : 'hidden lg:block'}`}>
                                {/* Language Select */}
                                <div>
                                    <label
                                        className={`block mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Language
                                    </label>
                                    <div className="relative mb-4">
                                        <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <select
                                            className={`w-full pl-10 pr-4 py-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                            value={selectedLanguage}
                                            onChange={(e) => {
                                                setSelectedLanguage(e.target.value);
                                                loadLanguageData(e.target.value);
                                            }}
                                        >
                                            <option value="">Select Language</option>
                                            {languages.map((lang) => (
                                                <option key={`lang-${lang}`} value={lang}>
                                                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* ILR Level Select */}
                                    <div>
                                        <label
                                            className={`block mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            ILR Level
                                        </label>
                                        <select
                                            className={`w-full px-4 py-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                            value={selectedIlrLevel}
                                            onChange={(e) => {
                                                setSelectedIlrLevel(e.target.value);
                                                searchArticles(articles, searchTopic, e.target.value, lowRange, highRange);
                                            }}
                                        >
                                            <option value="">All Levels</option>
                                            {ilrLevels.map((level) => (
                                                <option key={level} value={level}>ILR {level}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Topic Search */}
                                <div>
                                    <label
                                        className={`block mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Topic
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search topics..."
                                            value={searchTopic}
                                            onChange={(e) => {
                                                setSearchTopic(e.target.value);
                                                searchArticles(articles, e.target.value, selectedIlrLevel, lowRange, highRange);
                                            }}
                                            className={`w-full pl-10 pr-4 py-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                        />
                                    </div>
                                </div>

                                {/* ILR Range Inputs */}
                                <div className="space-y-4">
                                    <div>
                                        <label
                                            className={`block mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            ILR Range Low
                                        </label>
                                        <input
                                            type="number"
                                            value={lowRange}
                                            onChange={(e) => {
                                                setLowRange(e.target.value);
                                                searchArticles(articles, searchTopic, selectedIlrLevel, e.target.value, highRange);
                                            }}
                                            className={`w-full px-4 py-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                        />
                                    </div>
                                    <div>
                                        <label
                                            className={`block mb-2 text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            ILR Range High
                                        </label>
                                        <input
                                            type="number"
                                            value={highRange}
                                            onChange={(e) => {
                                                setHighRange(e.target.value);
                                                searchArticles(articles, searchTopic, selectedIlrLevel, lowRange, e.target.value);
                                            }}
                                            className={`w-full px-4 py-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="lg:w-3/4 flex-grow">
                        {!selectedLanguage ? (
                            <div
                                className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-8 flex flex-col items-center justify-center min-h-[400px]`}>
                                <Globe className="w-16 h-16 text-gray-400 mb-4" />
                                <h3 className={`text-xl font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'} mb-2`}>
                                    Select a Language
                                </h3>
                                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'} text-center`}>
                                    Choose a language from the filters panel to view available articles.
                                </p>
                            </div>
                        ) : isLoading ? (
                            <div className="flex justify-center items-center h-64">
                                <div
                                    className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"
                                />
                            </div>
                        ) : (
                            <>
                                {/* Results Grid */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    {getCurrentPageArticles().map((article, index) => (
                                        <div key={article.id || `article-${index}-${article.title}`}>
                                            {renderArticleCard(article)}
                                        </div>
                                    ))}
                                </div>

                                {/* Pagination */}
                                {filteredArticles.length > 0 && (
                                    <div className="flex justify-center items-center mt-6 space-x-2">
                                        <button
                                            onClick={() => changePage(-1)}
                                            disabled={currentPage === 1}
                                            className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <ChevronLeft className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                                        </button>
                                        <span className={`px-4 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            Page {currentPage} of {Math.ceil(filteredArticles.length / resultsPerPage)}
                                        </span>
                                        <button
                                            onClick={() => changePage(1)}
                                            disabled={currentPage === Math.ceil(filteredArticles.length / resultsPerPage)}
                                            className={`p-2 rounded ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} ${currentPage === Math.ceil(filteredArticles.length / resultsPerPage) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <ChevronRight className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
