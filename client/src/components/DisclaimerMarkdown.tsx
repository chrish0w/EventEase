import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
  className?: string;
}

export default function DisclaimerMarkdown({ content, className }: Props) {
  return (
    <div className={`text-sm text-gray-700 leading-relaxed space-y-2 ${className ?? ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-lg font-bold text-gray-800 mt-3 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold text-gray-800 mt-3 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-800 mt-2 mb-1">{children}</h3>,
          p:  ({ children }) => <p className="text-sm text-gray-700">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="text-sm text-gray-700">{children}</li>,
          a:  ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold text-gray-800">{children}</strong>,
          em:     ({ children }) => <em className="italic">{children}</em>,
          code:   ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-200 pl-3 text-gray-600 italic">{children}</blockquote>
          ),
          hr: () => <hr className="border-gray-200 my-3" />,
        }}
      >
        {content || '_(no content)_'}
      </ReactMarkdown>
    </div>
  );
}
