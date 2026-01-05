
import React, { useState, useRef } from 'react';
import { SKKNInput, SKKNSection, RefinementLevel, SKKNAudit, EvidenceItem, PedagogicalStyle } from './types';
import { generateSKKNContent, refineSKKNSection, auditSKKN, generateVisualAid, generateInfographicPrompt } from './services/geminiService';
import { LoadingOverlay } from './components/LoadingOverlay';
import { 
  CheckCircle, Printer, Copy, RefreshCcw, PenTool, 
  Sparkles, BookOpen, FileCode, Sliders, MessageSquare, 
  ChevronRight, Check, X, RotateCcw, User, ShieldCheck, 
  BarChart3, Image as ImageIcon, Lightbulb, Target, Award,
  Globe, Zap, Search, HelpCircle
} from 'lucide-react';

const App: React.FC = () => {
  const [input, setInput] = useState<SKKNInput>({
    subject: '',
    level: 'THCS',
    grade: '',
    topic: '',
    target: 'Học sinh và giáo viên trong nhà trường',
    useAI: true,
    style: 'Logic & Chặt chẽ'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [sections, setSections] = useState<SKKNSection[]>([]);
  const [evidenceChecklist, setEvidenceChecklist] = useState<EvidenceItem[]>([]);
  const [auditResult, setAuditResult] = useState<SKKNAudit | null>(null);
  const [activeTab, setActiveTab] = useState<string | 'all' | 'audit' | 'evidence'>('all');
  const [visualAid, setVisualAid] = useState<string | null>(null);
  const documentRef = useRef<HTMLDivElement>(null);

  const [refinementLevel, setRefinementLevel] = useState<RefinementLevel>('Xuất sắc');
  const [customInstruction, setCustomInstruction] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setVisualAid(null);
    try {
      const data = await generateSKKNContent(input);
      const initialSections = data.sections.map((s: any) => ({ ...s, status: 'idle' }));
      setSections(initialSections);
      setEvidenceChecklist(data.evidenceChecklist || []);
      setAuditResult(null);
      setActiveTab('all');
    } catch (error) {
      alert("Lỗi tạo văn bản. Hệ thống đang quá tải do nội dung quá dài.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateVisual = async (solutionTitle: string) => {
    setIsGeneratingImage(true);
    try {
      const prompt = await generateInfographicPrompt(solutionTitle);
      const imageUrl = await generateVisualAid(prompt);
      setVisualAid(imageUrl);
    } catch (error) {
      console.error("Lỗi tạo hình ảnh:", error);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleAudit = async () => {
    setIsAuditing(true);
    setActiveTab('audit');
    try {
      const fullText = sections.map(s => s.content).join('\n\n');
      const result = await auditSKKN(input.topic, fullText);
      setAuditResult(result);
    } catch (error) {
      alert("Lỗi thẩm định chuyên gia.");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRefine = async (sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!section) return;
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, status: 'refining' } : s));
    try {
      const result = await refineSKKNSection(input.topic, section.title, section.content, refinementLevel, customInstruction);
      setSections(prev => prev.map(s => s.id === sectionId ? { 
        ...s, originalContent: s.content, content: result.newContent, 
        refinementComment: result.comment, status: 'comparing' 
      } : s));
    } catch (error) {
      setSections(prev => prev.map(s => s.id === sectionId ? { ...s, status: 'idle' } : s));
    }
  };

  const discardRefinement = (sectionId: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { 
      ...s, 
      content: s.originalContent || s.content, 
      originalContent: undefined, 
      refinementComment: undefined, 
      status: 'idle' 
    } : s));
  };

  const applyRefinement = (sectionId: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { 
      ...s, 
      originalContent: undefined, 
      refinementComment: undefined, 
      status: 'idle' 
    } : s));
  };

  const handlePrint = () => {
    window.print();
  };

  const exportToWord = () => {
    if (!documentRef.current) return;
    const htmlContent = documentRef.current.innerHTML;
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'>
      <style>
        @page Section1 { size: 595.3pt 841.9pt; margin: 2.0cm 2.0cm 2.0cm 3.5cm; }
        div.Section1 { page: Section1; }
        body { font-family: 'Times New Roman', serif; font-size: 13.0pt; line-height: 150%; text-align: justify; }
        p { margin-bottom: 6pt; text-indent: 1.27cm; }
        table { border-collapse: collapse; width: 100%; border: 1pt solid windowtext; margin: 10pt 0; }
        td, th { border: 1pt solid windowtext; padding: 5pt; text-align: center; font-size: 12pt; }
        .text-center { text-align: center; text-indent: 0; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
      </style>
      </head><body><div class="Section1">${htmlContent}</div></body></html>`;
    
    const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SKKN_GIAI_NHAT_2025_TranThiNgoc.doc`;
    link.click();
  };

  const formatContent = (content: string) => {
    const lines = content.split('\n');
    const result: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('|')) {
        inTable = true;
        const cells = trimmedLine.split('|').filter(c => c.length > 0 || trimmedLine.indexOf('|' + c + '|') !== -1);
        if (!trimmedLine.includes('---')) {
           tableRows.push(cells.map(c => c.trim()));
        }
      } else {
        if (inTable && tableRows.length > 0) {
          result.push(
            <table key={`table-${idx}`} className="w-full my-6 border-collapse border border-black text-[12pt]">
              <thead>
                <tr className="bg-slate-50 font-bold">
                  {tableRows[0].map((cell, i) => <th key={i} className="border border-black p-2">{cell}</th>)}
                </tr>
              </thead>
              <tbody>
                {tableRows.slice(1).map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => <td key={j} className="border border-black p-2">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          );
          inTable = false;
          tableRows = [];
        }
        if (trimmedLine.length > 0) {
          result.push(<p key={idx} className="mb-4 indent-8 leading-relaxed text-justify">{trimmedLine}</p>);
        }
      }
    });

    return result;
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {isGenerating && <LoadingOverlay />}
      
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white py-8 px-4 no-print shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <Globe className="w-96 h-96 -ml-20 -mt-20 animate-spin-slow" />
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-yellow-400/20 rounded-3xl shadow-inner border border-yellow-400/30">
              <Award className="w-10 h-10 text-yellow-400 drop-shadow-lg" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter flex items-center gap-3">
                SKKN EXPERT PRO <span className="bg-yellow-400 text-blue-900 text-xs px-2 py-1 rounded-md">GOLD EDITION</span>
              </h1>
              <p className="text-blue-100 text-sm font-medium opacity-90 tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" /> HƯỚNG TỚI GIẢI NHẤT CẤP TỈNH/QUỐC GIA 2025
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-white/10 px-6 py-3 rounded-2xl border border-white/20 text-xs font-black flex items-center gap-3 shadow-lg">
              <User className="w-5 h-5 text-yellow-300" /> TRẦN THỊ NGỌC
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-10">
        {!sections.length ? (
          <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden">
             <div className="grid md:grid-cols-5 h-full">
                <div className="md:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 p-12 space-y-10">
                   <div className="space-y-4">
                      <h3 className="text-blue-900 font-black text-2xl">CHIẾN LƯỢC GIẢI NHẤT</h3>
                      <p className="text-sm text-blue-700/80 leading-relaxed font-medium">
                        "Một bài viết đạt giải nhất phải hội tụ đủ: <strong>Tính mới đột phá</strong>, <strong>Cơ sở thực tiễn sống động</strong> và <strong>Trình bày chuyên sâu</strong>."
                      </p>
                   </div>
                   <div className="space-y-6">
                      <div className="flex items-start gap-4 p-4 bg-white/60 rounded-2xl border border-blue-100 shadow-sm">
                        <Search className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                        <div>
                          <p className="text-xs font-black text-blue-900 uppercase">Live Search Grounding</p>
                          <p className="text-xs text-slate-500 mt-1">Cập nhật xu hướng giáo dục thực tế nhất 2025 qua Google Search.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-white/60 rounded-2xl border border-blue-100 shadow-sm">
                        <ImageIcon className="w-6 h-6 text-indigo-600 shrink-0 mt-1" />
                        <div>
                          <p className="text-xs font-black text-blue-900 uppercase">AI Visual Evidence</p>
                          <p className="text-xs text-slate-500 mt-1">Tự động tạo sơ đồ quy trình và hình ảnh minh chứng bằng AI.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4 p-4 bg-white/60 rounded-2xl border border-blue-100 shadow-sm">
                        <ShieldCheck className="w-6 h-6 text-green-600 shrink-0 mt-1" />
                        <div>
                          <p className="text-xs font-black text-blue-900 uppercase">Scientific Rigor</p>
                          <p className="text-xs text-slate-500 mt-1">Lập luận sắc bén, trích dẫn văn bản pháp luật chuẩn 2025.</p>
                        </div>
                      </div>
                   </div>
                </div>
                <div className="md:col-span-3 p-12">
                   <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Môn học</label>
                          <input required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-blue-900" placeholder="Ví dụ: Tin học" value={input.subject} onChange={e => setInput({...input, subject: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Khối lớp</label>
                          <input required className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold text-blue-900" placeholder="Lớp 6, 7, 8, 9..." value={input.grade} onChange={e => setInput({...input, grade: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Định hướng phong cách</label>
                        <div className="grid grid-cols-3 gap-3">
                           {(['Logic & Chặt chẽ', 'Truyền cảm hứng', 'Đổi mới & Đột phá'] as PedagogicalStyle[]).map(s => (
                             <button type="button" key={s} onClick={() => setInput({...input, style: s})} className={`py-4 px-2 rounded-2xl text-[10px] font-black border transition-all uppercase tracking-tighter ${input.style === s ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:bg-blue-50/50'}`}>
                               {s}
                             </button>
                           ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tên đề tài (Quyết định 50% sự thành công)</label>
                        <textarea required rows={4} className="w-full px-6 py-5 rounded-[2rem] bg-slate-50 border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none text-sm font-black leading-relaxed text-blue-900" placeholder="Hãy nhập tên đề tài đầy đủ. AI sẽ tinh chỉnh để nghe 'Kêu' hơn và 'Sâu' hơn..." value={input.topic} onChange={e => setInput({...input, topic: e.target.value})} />
                      </div>
                      <button type="submit" className="w-full bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-black py-6 rounded-[2rem] shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-4 uppercase tracking-[0.2em] text-sm group">
                        <PenTool className="w-6 h-6 group-hover:rotate-12 transition-transform" /> Chế độ Chấp bút Giải Nhất
                      </button>
                   </form>
                </div>
             </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Navigation */}
            <div className="lg:w-1/4 no-print space-y-6">
               <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl sticky top-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Bàn điều khiển Pro
                  </h3>
                  <div className="space-y-2">
                    <button onClick={() => setActiveTab('all')} className={`w-full text-left px-5 py-4 rounded-2xl text-xs transition-all flex items-center gap-4 ${activeTab === 'all' ? 'bg-blue-600 text-white font-black shadow-xl shadow-blue-200' : 'hover:bg-slate-50 text-slate-600 font-bold'}`}>
                      <FileCode className="w-5 h-5" /> Toàn văn Sáng kiến
                    </button>
                    <button onClick={handleAudit} className={`w-full text-left px-5 py-4 rounded-2xl text-xs transition-all flex items-center gap-4 ${activeTab === 'audit' ? 'bg-blue-600 text-white font-black shadow-xl shadow-blue-200' : 'hover:bg-slate-50 text-slate-600 font-bold'}`}>
                      <ShieldCheck className="w-5 h-5" /> Thẩm định Giải Nhất
                    </button>
                  </div>
                  
                  <div className="mt-10 pt-8 border-t border-slate-100">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Danh mục nghiên cứu</h3>
                    <div className="space-y-1">
                      {sections.map(s => (
                        <button key={s.id} onClick={() => setActiveTab(s.id)} className={`w-full text-left px-4 py-3 rounded-xl text-[11px] transition-all flex items-center justify-between ${activeTab === s.id ? 'bg-blue-50 text-blue-700 font-black' : 'hover:bg-slate-100 text-slate-500 font-medium'}`}>
                          <span className="truncate">{s.title}</span>
                          <ChevronRight className="w-3 h-3 opacity-30" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-10 pt-8 border-t border-slate-100 space-y-3">
                    <button onClick={exportToWord} className="w-full flex items-center gap-3 px-6 py-4 bg-green-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-100">
                      <FileCode className="w-5 h-5" /> Tải File Word Chuẩn
                    </button>
                    <button onClick={handlePrint} className="w-full flex items-center gap-3 px-6 py-4 bg-blue-50 text-blue-700 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all">
                      <Printer className="w-5 h-5" /> In Bản Cứng / PDF
                    </button>
                  </div>
               </div>
            </div>

            {/* Content Area */}
            <div className="lg:w-3/4">
              {activeTab === 'all' && (
                <div 
                  ref={documentRef} 
                  className="bg-white shadow-2xl border border-slate-200 rounded-sm p-[2cm] pr-[1.5cm] pt-[2cm] pb-[2cm] pl-[3.5cm] w-full mx-auto times-new-roman text-[13pt] leading-[1.5] text-justify min-h-[1000px] relative"
                >
                  {/* Trang bìa chuẩn quy định - Updated with UBND Xã Thanh Nưa */}
                  <div className="text-center mb-16 pb-12 border-b-2 border-slate-300">
                    <h3 className="uppercase font-bold text-[13pt] mb-1">UBND XÃ THANH NƯA</h3>
                    <h3 className="uppercase font-bold text-[13pt] mb-4">TRƯỜNG THCS THANH LUÔNG</h3>
                    <div className="my-20">
                      <h1 className="text-[20pt] font-bold uppercase mb-6 leading-tight">SÁNG KIẾN KINH NGHIỆM</h1>
                      <div className="h-1 bg-black w-32 mx-auto mb-8"></div>
                      <p className="text-[15pt] font-bold uppercase mb-12 px-12 leading-relaxed italic">"{input.topic}"</p>
                    </div>
                    <div className="text-left mt-32 ml-16 space-y-5 font-bold">
                      <p className="flex justify-between w-[80%]"><span>Họ và tên tác giả:</span> <span>Trần Thị Ngọc</span></p>
                      <p className="flex justify-between w-[80%]"><span>Đơn vị công tác:</span> <span>Trường THCS Thanh Luông xã Thanh Nưa, tỉnh Điện Biên</span></p>
                      <p className="flex justify-between w-[80%]"><span>Địa chỉ:</span> <span>Xã Thanh Nưa, huyện Điện Biên</span></p>
                      <p className="flex justify-between w-[80%]"><span>Lĩnh vực nghiên cứu:</span> <span>{input.subject}</span></p>
                    </div>
                    <div className="mt-48 font-bold uppercase text-[12pt] tracking-widest">Điện Biên, năm 2025</div>
                  </div>

                  {/* Nội dung các phần */}
                  {sections.map(s => (
                    <div key={s.id} className="mb-12">
                      <h2 className="font-bold uppercase mb-8 text-[14pt] text-center border-b pb-2 inline-block w-full">{s.title}</h2>
                      <div className="skkn-content">
                        {formatContent(s.content)}
                      </div>
                    </div>
                  ))}

                  <div className="mt-24 flex justify-between pt-10 border-t border-slate-100">
                    <div className="text-center italic"><p className="font-bold not-italic uppercase">Người thẩm định</p><p className="mt-28 font-bold text-slate-200">(Ký và ghi rõ họ tên)</p></div>
                    <div className="text-center italic">
                      <p>Thanh Nưa, ngày ..... tháng ..... năm 2025</p>
                      <p className="font-bold not-italic uppercase text-[13pt]">Tác giả sáng kiến</p>
                      <div className="mt-28 font-bold not-italic"><p>Trần Thị Ngọc</p></div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audit' && auditResult && (
                <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-200 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                   <div className="flex items-center gap-8 border-b pb-10">
                      <div className="p-6 bg-gradient-to-br from-green-500 to-green-700 rounded-3xl shadow-xl shadow-green-100">
                        <ShieldCheck className="w-12 h-12 text-white" />
                      </div>
                      <div>
                         <h2 className="text-3xl font-black text-blue-900 tracking-tight flex items-center gap-3">
                           THẨM ĐỊNH GIẢI NHẤT 2025
                         </h2>
                         <p className="text-slate-500 text-sm italic font-semibold mt-1">Hệ thống phân tích đa tầng dựa trên bộ tiêu chí Giải thưởng Quốc gia</p>
                      </div>
                   </div>
                   
                   <div className="grid md:grid-cols-3 gap-10">
                      <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-10 rounded-[2rem] text-center shadow-2xl shadow-blue-200 relative overflow-hidden group">
                         <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         <p className="text-[10px] font-black text-blue-300 uppercase mb-4 tracking-[0.3em] relative z-10">Tổng điểm tích lũy</p>
                         <div className="text-7xl font-black relative z-10">{auditResult.totalScore}<span className="text-2xl text-blue-400">/100</span></div>
                      </div>
                      <div className="md:col-span-2 bg-gradient-to-br from-yellow-50 to-orange-50 p-10 rounded-[2rem] border border-yellow-100 flex flex-col justify-center relative group">
                         <Award className="absolute top-6 right-6 w-12 h-12 text-yellow-400/20 group-hover:scale-110 transition-transform" />
                         <p className="text-[10px] font-black text-yellow-700 uppercase mb-4 tracking-[0.3em]">Xếp hạng dự kiến</p>
                         <div className="text-5xl font-black text-yellow-800 mb-4">{auditResult.prizePrediction}</div>
                         <p className="text-sm text-yellow-900/70 leading-relaxed font-bold italic">"{auditResult.overallAdvice}"</p>
                      </div>
                   </div>

                   <div className="grid md:grid-cols-2 gap-6">
                      {auditResult.criteria.map((c, i) => (
                        <div key={i} className="p-6 bg-white border border-slate-100 rounded-[1.5rem] hover:border-blue-400 hover:shadow-xl transition-all group flex flex-col justify-between">
                           <div>
                             <div className="flex justify-between items-center mb-4">
                                <span className="font-black text-slate-800 text-xs uppercase tracking-wider group-hover:text-blue-700 transition-colors">{c.label}</span>
                                <span className="font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full text-xs shadow-inner">{c.score}/{c.maxScore}</span>
                             </div>
                             <p className="text-sm text-slate-500 italic leading-relaxed font-medium">"{c.feedback}"</p>
                           </div>
                           <div className="w-full h-1.5 bg-slate-100 rounded-full mt-6 overflow-hidden">
                              <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${(c.score/c.maxScore)*100}%` }}></div>
                           </div>
                        </div>
                      ))}
                   </div>

                   <div className="mt-10 p-8 bg-indigo-900 text-white rounded-[2rem] flex gap-6 shadow-2xl relative overflow-hidden group">
                      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-125 transition-transform"></div>
                      <div className="p-4 bg-white/10 rounded-2xl h-fit shadow-inner"><Lightbulb className="w-8 h-8 text-yellow-300 animate-pulse" /></div>
                      <div>
                         <h4 className="font-black text-lg uppercase tracking-wider">Chiến lược bứt phá Giải Nhất:</h4>
                         <p className="text-sm text-indigo-100 mt-2 font-medium leading-relaxed">
                           "Cô Ngọc hãy tập trung bổ sung thêm một 'Giải pháp chuyển đổi số' mạnh mẽ hơn. Giám khảo năm 2025 cực kỳ quan tâm đến việc ứng dụng AI thực thụ để giải quyết gánh nặng hành chính cho giáo viên. Hãy sử dụng tính năng 'Nâng cấp nội dung Pro' ở phần Giải pháp để AI viết sâu hơn về mảng này."
                         </p>
                      </div>
                   </div>
                </div>
              )}

              {/* Editor cho từng phần */}
              {sections.some(s => s.id === activeTab) && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                  {sections.filter(s => s.id === activeTab).map(s => (
                    <div key={s.id} className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                      <div className="bg-slate-50 px-10 py-6 border-b flex justify-between items-center">
                         <div className="flex items-center gap-3">
                           <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                           <h2 className="font-black text-blue-900 uppercase text-xs tracking-widest">{s.title}</h2>
                         </div>
                         <div className="flex bg-white rounded-2xl border p-1.5 shadow-inner scale-90">
                            {(['Cơ bản', 'Nâng cao', 'Xuất sắc'] as RefinementLevel[]).map(lvl => (
                              <button key={lvl} onClick={() => setRefinementLevel(lvl)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${refinementLevel === lvl ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-400 hover:text-slate-600'}`}>
                                {lvl}
                              </button>
                            ))}
                         </div>
                      </div>
                      <div className="p-10 space-y-8">
                        {s.status === 'comparing' && (
                          <div className="bg-blue-50 border-l-8 border-blue-600 p-6 rounded-2xl flex gap-6 animate-in slide-in-from-top-4 shadow-sm">
                             <div className="p-3 bg-white rounded-xl shadow-sm h-fit"><MessageSquare className="w-6 h-6 text-blue-600" /></div>
                             <div>
                                <p className="text-[10px] font-black text-blue-800 uppercase mb-2 tracking-widest">Gợi ý từ Chuyên gia:</p>
                                <p className="text-sm text-blue-700 italic leading-relaxed font-bold">"{s.refinementComment}"</p>
                             </div>
                          </div>
                        )}

                        <div className="relative group">
                          <textarea 
                            className={`w-full h-[700px] p-10 rounded-[2rem] border outline-none focus:ring-8 focus:ring-blue-500/5 transition-all times-new-roman text-[13.5pt] leading-relaxed shadow-inner ${s.status === 'comparing' ? 'bg-blue-50/30 border-blue-200 ring-4 ring-blue-500/5' : 'border-slate-100 bg-slate-50/30 hover:bg-slate-50/50'}`}
                            value={s.content}
                            onChange={(e) => setSections(prev => prev.map(item => item.id === s.id ? {...item, content: e.target.value} : item))}
                          />
                          <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleCreateVisual(s.title)} className="p-3 bg-white border border-slate-200 rounded-xl shadow-lg hover:bg-blue-50 text-blue-600 transition-all flex items-center gap-2 text-[10px] font-black uppercase" title="Tạo sơ đồ minh họa bằng AI">
                              {isGeneratingImage ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                              Tạo minh chứng AI
                            </button>
                          </div>
                        </div>

                        {visualAid && activeTab === s.id && (
                          <div className="p-6 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center space-y-4 animate-in zoom-in-95 duration-500">
                             <img src={visualAid} alt="AI Visual Aid" className="max-w-full rounded-2xl shadow-2xl mx-auto border-4 border-white" />
                             <p className="text-xs text-slate-500 font-bold italic tracking-wide">Sơ đồ minh chứng gợi ý bởi AI - Cô có thể tải về và đưa vào Phụ lục bài viết.</p>
                             <button onClick={() => setVisualAid(null)} className="text-[10px] font-black text-red-500 uppercase hover:underline">Gỡ bỏ</button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-8 border-t pt-10">
                           <div className="flex-1 min-w-[400px] relative">
                              <PenTool className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                              <input placeholder="VD: Hãy bổ sung thêm ví dụ về dạy học Tin học 8 dùng ChatGPT..." className="w-full pl-16 pr-6 py-5 bg-white rounded-[1.5rem] border-none ring-1 ring-slate-200 text-sm font-medium focus:ring-4 focus:ring-blue-500/10 outline-none shadow-sm transition-all" value={customInstruction} onChange={e => setCustomInstruction(e.target.value)} />
                           </div>
                           <div className="flex gap-4">
                              {s.status === 'comparing' ? (
                                <>
                                  <button onClick={() => discardRefinement(s.id)} className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Giữ bản cũ</button>
                                  <button onClick={() => applyRefinement(s.id)} className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200">Áp dụng bản mới</button>
                                </>
                              ) : (
                                <button onClick={() => handleRefine(s.id)} className="px-12 py-5 bg-blue-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all shadow-2xl flex items-center gap-4 group">
                                  {s.status === 'refining' ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-yellow-300 group-hover:rotate-45 transition-transform" />}
                                  {s.status === 'refining' ? 'Đang phân tích sâu...' : 'Nâng cấp nội dung Pro'}
                                </button>
                              )}
                           </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-32 border-t border-slate-200 py-20 text-center no-print bg-white/50 backdrop-blur-md">
        <Award className="w-12 h-12 text-yellow-400/20 mx-auto mb-6" />
        <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.5em] mb-4">© 2025 SKKN EXPERT PRO - ĐỒNG HÀNH CÙNG GIẢI NHẤT</p>
        <p className="text-slate-300 text-[10px] uppercase tracking-widest">Sản phẩm độc quyền tối ưu cho giáo viên tỉnh Điện Biên</p>
      </footer>
    </div>
  );
};

export default App;
