import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

interface DocFile {
  id: string;
  name: string;
  content: string;
  category: 'guide' | 'reference' | 'changelog' | 'config';
  lastModified?: string;
  size?: number;
}

interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
}

export default function Docs() {
  const [docFiles, setDocFiles] = useState<DocFile[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocFile | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDocIcon = (category: string) => {
    switch (category) {
      case 'guide': return '📖';
      case 'reference': return '📚';
      case 'changelog': return '📝';
      case 'config': return '⚙️';
      default: return '📄';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'guide': return 'blue';
      case 'reference': return 'green';
      case 'changelog': return 'purple';
      case 'config': return 'orange';
      default: return 'gray';
    }
  };

  const categorizeFile = (filename: string): 'guide' | 'reference' | 'changelog' | 'config' => {
    const lower = filename.toLowerCase();
    
    if (lower.includes('readme') || lower.includes('contributing') || lower.includes('strategies-builder')) {
      return 'guide';
    }
    if (lower.includes('changelog')) {
      return 'changelog';
    }
    if (lower.includes('code_of_conduct') || lower.includes('_sidebar')) {
      return 'config';
    }
    return 'reference'; // DEBUG.md, database.md, product-requirements.md, etc.
  };

  const loadDocumentsFromGitHub = async () => {
    setInitialLoading(true);
    setError(null);
    
    try {
      console.log('📚 Loading documents from GitHub...');
      
      // Fetch the list of files in the docs directory
      const docsResponse = await fetch('https://api.github.com/repos/ilanKushnir/bull-trigger/contents/docs');
      
      if (!docsResponse.ok) {
        throw new Error(`GitHub API error: ${docsResponse.status} ${docsResponse.statusText}`);
      }
      
      const docsFiles: GitHubFile[] = await docsResponse.json();
      console.log('📁 Found docs files:', docsFiles);
      
      // Also fetch the README.md from root
      const readmeResponse = await fetch('https://api.github.com/repos/ilanKushnir/bull-trigger/contents/README.md');
      let readmeFile: GitHubFile | null = null;
      
      if (readmeResponse.ok) {
        readmeFile = await readmeResponse.json();
        console.log('📖 Found README.md:', readmeFile);
      } else {
        console.warn('⚠️ README.md not found in repository root');
      }
      
      // Process docs folder markdown files
      const docsMarkdownFiles = docsFiles
        .filter(file => file.type === 'file' && file.name.endsWith('.md'))
        .map(file => ({
          id: file.name.replace('.md', '').toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: file.name,
          content: '',
          category: categorizeFile(file.name),
          size: file.size,
          downloadUrl: file.download_url
        }));

      // Add README.md from root if it exists
      let allMarkdownFiles = [...docsMarkdownFiles];
      if (readmeFile) {
        allMarkdownFiles.unshift({
          id: 'readme-main',
          name: 'README.md',
          content: '',
          category: 'guide' as const,
          size: readmeFile.size,
          downloadUrl: readmeFile.download_url
        });
      }

      console.log('📚 Processed markdown files:', allMarkdownFiles);
      setDocFiles(allMarkdownFiles);
      
      // Select the README.md from root as default, then first document
      const defaultDoc = allMarkdownFiles.find(doc => doc.id === 'readme-main') || 
                        allMarkdownFiles.find(doc => doc.name.toLowerCase().includes('readme')) || 
                        allMarkdownFiles[0];
      if (defaultDoc) {
        setSelectedDoc(defaultDoc);
        await loadDocContent(defaultDoc);
      }
      
    } catch (err) {
      console.error('❌ Error loading documents from GitHub:', err);
      setError(`Failed to load documents from GitHub: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadDocContent = async (docFile: DocFile & { downloadUrl?: string }) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📖 Loading content for: ${docFile.name}`);
      
      // Use the GitHub raw content URL
      let url: string;
      if (docFile.downloadUrl) {
        // Use the download URL from GitHub API if available
        url = docFile.downloadUrl;
      } else if (docFile.id === 'readme-main') {
        // README.md is in the root directory
        url = `https://raw.githubusercontent.com/ilanKushnir/bull-trigger/main/${docFile.name}`;
      } else {
        // Other files are in the docs directory
        url = `https://raw.githubusercontent.com/ilanKushnir/bull-trigger/main/docs/${docFile.name}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch ${docFile.name}: ${response.status} ${response.statusText}`);
      }
      
      const content = await response.text();
      console.log(`✅ Loaded ${content.length} characters for ${docFile.name}`);
      
      setDocContent(content);
      
    } catch (err) {
      console.error(`❌ Error loading ${docFile.name}:`, err);
      setError(`Failed to load ${docFile.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDocSelect = (doc: DocFile) => {
    setSelectedDoc(doc);
    loadDocContent(doc as DocFile & { downloadUrl?: string });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // Load documents on component mount
  useEffect(() => {
    loadDocumentsFromGitHub();
  }, []);

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-400 mb-2">
            📚 Documentation
          </h1>
          <p className="text-gray-400">
            Loading documents from GitHub repository...
          </p>
        </div>
        <div className="flex items-center justify-center h-96">
          <div className="text-blue-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mb-2"></div>
            Loading documents from GitHub...
          </div>
        </div>
      </div>
    );
  }

  if (error && docFiles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-blue-400 mb-2">
            📚 Documentation
          </h1>
          <p className="text-gray-400">
            Failed to load documents from GitHub repository
          </p>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-red-400 mb-4">❌ {error}</div>
            <Button onClick={loadDocumentsFromGitHub}>
              🔄 Retry Loading Documents
            </Button>
            <p className="text-gray-500 text-sm mt-4">
              Trying to load from: <a 
                href="https://github.com/ilanKushnir/bull-trigger/tree/main/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 underline"
              >
                https://github.com/ilanKushnir/bull-trigger/tree/main/docs
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-blue-400 mb-2">
          📚 Documentation
        </h1>
        <p className="text-gray-400">
          Live documentation from <a 
            href="https://github.com/ilanKushnir/bull-trigger/tree/main/docs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 underline hover:text-blue-300"
          >
            GitHub repository
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Document Explorer */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center space-x-2">
                <span>📂</span>
                <span>Documents</span>
              </CardTitle>
              <Button 
                size="sm" 
                variant="outline"
                onClick={loadDocumentsFromGitHub}
                disabled={initialLoading}
              >
                🔄
              </Button>
            </div>
            <p className="text-xs text-gray-500">{docFiles.length} files found</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {docFiles.map(doc => (
                <div
                  key={doc.id}
                  onClick={() => handleDocSelect(doc)}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    selectedDoc?.id === doc.id 
                      ? 'bg-blue-600' 
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span>{getDocIcon(doc.category)}</span>
                    <span className="text-white text-sm font-medium">
                      {doc.name.replace('.md', '')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <Badge 
                      variant={getCategoryColor(doc.category) as any}
                      className="text-xs"
                    >
                      {doc.category}
                    </Badge>
                    {doc.size && (
                      <span className="text-xs text-gray-500">
                        {formatFileSize(doc.size)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Document Viewer */}
        <div className="lg:col-span-3">
          {selectedDoc ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-white flex items-center space-x-2">
                    <span>{getDocIcon(selectedDoc.category)}</span>
                    <span>{selectedDoc.name}</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="info">MARKDOWN</Badge>
                    <Badge variant={getCategoryColor(selectedDoc.category) as any}>
                      {selectedDoc.category.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-3 mt-4">
                  <Button 
                    size="sm"
                    onClick={() => loadDocContent(selectedDoc as DocFile & { downloadUrl?: string })}
                    disabled={loading}
                  >
                    {loading ? '⏳' : '🔄'} {loading ? 'Loading...' : 'Refresh'}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      const url = selectedDoc.id === 'readme-main' 
                        ? `https://raw.githubusercontent.com/ilanKushnir/bull-trigger/main/${selectedDoc.name}`
                        : `https://raw.githubusercontent.com/ilanKushnir/bull-trigger/main/docs/${selectedDoc.name}`;
                      window.open(url, '_blank');
                    }}
                  >
                    📤 View Raw
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      const url = selectedDoc.id === 'readme-main'
                        ? `https://github.com/ilanKushnir/bull-trigger/blob/main/${selectedDoc.name}`
                        : `https://github.com/ilanKushnir/bull-trigger/blob/main/docs/${selectedDoc.name}`;
                      window.open(url, '_blank');
                    }}
                  >
                    🔗 GitHub
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading && (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-blue-400">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mb-2"></div>
                      Loading {selectedDoc.name}...
                    </div>
                  </div>
                )}
                
                {error && !loading && (
                  <div className="flex flex-col items-center justify-center h-96 space-y-4">
                    <div className="text-red-400">❌ {error}</div>
                    <Button onClick={() => loadDocContent(selectedDoc as DocFile & { downloadUrl?: string })}>
                      🔄 Retry
                    </Button>
                  </div>
                )}
                
                {!loading && !error && docContent && (
                  <div className="h-96 overflow-y-auto bg-gray-900 p-6 rounded border border-gray-600">
                    <div className="prose prose-invert prose-blue max-w-none
                        prose-headings:text-blue-400 
                        prose-h1:text-2xl prose-h1:font-bold prose-h1:mb-4
                        prose-h2:text-xl prose-h2:font-semibold prose-h2:mb-3 prose-h2:mt-6
                        prose-h3:text-lg prose-h3:font-medium prose-h3:mb-2 prose-h3:mt-4
                        prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                        prose-strong:text-white prose-strong:font-semibold
                        prose-code:bg-gray-800 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-blue-300
                        prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-600 prose-pre:rounded-lg
                        prose-blockquote:border-l-blue-500 prose-blockquote:border-l-4 prose-blockquote:pl-4 prose-blockquote:italic
                        prose-ul:text-gray-300 prose-ol:text-gray-300
                        prose-li:mb-1
                        prose-a:text-blue-400 prose-a:underline hover:prose-a:text-blue-300">
                      <ReactMarkdown>
                        {docContent}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
                
                {!loading && !error && !docContent && (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-gray-400">No content available</div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-gray-400 mb-4">📚 Select a document to view</div>
                <p className="text-gray-500 text-sm">
                  Choose from the documents in the sidebar to view their content
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 