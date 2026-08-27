import { useEffect, useRef } from 'react';

/** 가벼운 HTML WYSIWYG (굵게/목록/이미지) */
export default function HtmlEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || '';
    }
  }, [value]);

  const exec = (cmd, arg) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange?.(ref.current?.innerHTML || '');
  };

  const onInput = () => onChange?.(ref.current?.innerHTML || '');

  const insertImage = () => {
    const url = window.prompt('이미지 URL을 입력하세요');
    if (!url) return;
    exec('insertImage', url);
  };

  return (
    <div className="html-editor">
      <div className="html-editor-toolbar">
        <button type="button" onClick={() => exec('bold')}>
          굵게
        </button>
        <button type="button" onClick={() => exec('italic')}>
          기울임
        </button>
        <button type="button" onClick={() => exec('insertUnorderedList')}>
          목록
        </button>
        <button type="button" onClick={() => exec('insertOrderedList')}>
          번호 목록
        </button>
        <button type="button" onClick={insertImage}>
          이미지
        </button>
      </div>
      <div
        ref={ref}
        className="html-editor-body"
        contentEditable
        data-placeholder={placeholder || '내용을 입력하세요'}
        onInput={onInput}
        suppressContentEditableWarning
      />
    </div>
  );
}
