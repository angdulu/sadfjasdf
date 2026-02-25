const ocrFileInput = document.getElementById('ocr-file');
const ocrLangSelect = document.getElementById('ocr-lang');
const ocrModeSelect = document.getElementById('ocr-mode');
const ocrRunButton = document.getElementById('ocr-run');
const ocrStatus = document.getElementById('ocr-status');
const ocrOutput = document.getElementById('ocr-output');
const ocrPreview = document.getElementById('ocr-preview');

const aiModelInput = document.getElementById('ai-model');
const aiRunButton = document.getElementById('ai-run');
const aiStatus = document.getElementById('ai-status');
const aiOutput = document.getElementById('ai-output');

let ocrFile = null;

if (ocrFileInput) {
    ocrFileInput.addEventListener('change', (event) => {
        const [file] = event.target.files;
        ocrFile = file || null;
        if (!ocrFile) {
            ocrPreview.style.display = 'none';
            ocrStatus.textContent = 'Status: Idle';
            return;
        }

        const url = URL.createObjectURL(ocrFile);
        ocrPreview.src = url;
        ocrPreview.style.display = 'block';
        ocrStatus.textContent = 'Status: Ready to extract';
    });
}

if (ocrRunButton) {
    ocrRunButton.addEventListener('click', async () => {
        if (!ocrFile) {
            ocrStatus.textContent = 'Status: 이미지 파일을 먼저 선택하세요.';
            return;
        }
        if (!window.Tesseract) {
            ocrStatus.textContent = 'Status: OCR 엔진 로드 실패';
            return;
        }

        const lang = ocrLangSelect?.value || 'kor+eng';
        const mode = ocrModeSelect?.value || 'auto';

        ocrRunButton.disabled = true;
        ocrOutput.value = '';
        ocrStatus.textContent = 'Status: OCR 준비 중...';

        try {
            const candidates = await buildOcrCandidates(ocrFile, mode);
            let best = { text: '', score: -1 };

            for (let i = 0; i < candidates.length; i += 1) {
                const candidate = candidates[i];
                const text = await runOcr(candidate.image, lang, `Pass ${i + 1}/${candidates.length}: ${candidate.name}`);
                const score = scoreRecognizedText(text);
                if (score > best.score) {
                    best = { text, score };
                }
            }

            const finalText = (best.text || '').trim();
            ocrOutput.value = finalText || '텍스트를 인식하지 못했습니다. 전처리를 바꾸거나 더 밝은 환경에서 다시 촬영하세요.';
            ocrStatus.textContent = finalText ? 'Status: OCR complete' : 'Status: OCR complete (low confidence)';
        } catch (error) {
            console.error(error);
            ocrStatus.textContent = `Status: OCR failed (${error.message})`;
        } finally {
            ocrRunButton.disabled = false;
        }
    });
}

if (aiRunButton) {
    aiRunButton.addEventListener('click', async () => {
        const sourceText = ocrOutput?.value?.trim() || '';
        const model = aiModelInput?.value?.trim() || '';

        if (!sourceText) {
            aiStatus.textContent = 'Status: OCR 텍스트가 비어 있습니다.';
            return;
        }
        if (!model) {
            aiStatus.textContent = 'Status: 모델명을 입력하세요.';
            return;
        }

        aiRunButton.disabled = true;
        aiStatus.textContent = 'Status: 분석 중...';
        aiOutput.value = '';

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, sourceText })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = data?.error?.message || `HTTP ${response.status}`;
                throw new Error(message);
            }

            const rawContent = data?.choices?.[0]?.message?.content;
            if (!rawContent || typeof rawContent !== 'string') {
                throw new Error('AI response missing content.');
            }

            const parsed = safeJsonParse(rawContent);
            aiOutput.value = parsed ? formatAnalysis(parsed) : rawContent;
            aiStatus.textContent = 'Status: 분석 완료';
        } catch (error) {
            console.error(error);
            aiStatus.textContent = `Status: 분석 실패 (${error.message})`;
            aiOutput.value = `분석 실패: ${error.message}\n\n서버 OPENAI_API_KEY/모델 설정을 확인하세요.`;
        } finally {
            aiRunButton.disabled = false;
        }
    });
}

async function buildOcrCandidates(file, mode) {
    const original = { name: '원본', image: file };

    if (mode === 'none') {
        return [original];
    }

    if (mode === 'contrast') {
        return [
            { name: '명암 강화', image: await preprocessImage(file, 'contrast') },
            original
        ];
    }

    if (mode === 'bw') {
        return [
            { name: '흑백 이진화', image: await preprocessImage(file, 'bw') },
            original
        ];
    }

    return [
        { name: '명암 강화', image: await preprocessImage(file, 'contrast') },
        { name: '흑백 이진화', image: await preprocessImage(file, 'bw') },
        original
    ];
}

async function runOcr(imageLike, lang, label) {
    const result = await window.Tesseract.recognize(imageLike, lang, {
        logger: (message) => {
            if (!message.status || message.progress == null) {
                return;
            }
            const pct = Math.round(message.progress * 100);
            ocrStatus.textContent = `Status: ${label} - ${message.status} (${pct}%)`;
        }
    });

    return (result?.data?.text || '').trim();
}

function scoreRecognizedText(text) {
    if (!text) {
        return 0;
    }
    const normalized = text.replace(/\s+/g, ' ').trim();
    const words = normalized.split(' ').filter(Boolean).length;
    const koreanChars = (normalized.match(/[가-힣]/g) || []).length;
    const alphaNum = (normalized.match(/[A-Za-z0-9]/g) || []).length;
    return normalized.length + (words * 4) + koreanChars + Math.floor(alphaNum * 0.4);
}

async function preprocessImage(file, mode) {
    const bitmap = await createImageBitmap(file);
    const maxSide = 2400;
    const scale = Math.min(2, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    ctx.drawImage(bitmap, 0, 0, width, height);
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let luminanceSum = 0;
    for (let i = 0; i < data.length; i += 4) {
        const lum = (0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2]);
        luminanceSum += lum;
    }
    const meanLum = luminanceSum / (data.length / 4);

    for (let i = 0; i < data.length; i += 4) {
        const lum = (0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2]);
        let value = lum;

        if (mode === 'contrast') {
            value = clamp((lum - meanLum) * 1.9 + meanLum + 10, 0, 255);
        } else if (mode === 'bw') {
            const threshold = clamp(meanLum - 8, 90, 170);
            value = lum > threshold ? 255 : 0;
        }

        data[i] = value;
        data[i + 1] = value;
        data[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);
    return await new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Failed to preprocess image'));
                return;
            }
            resolve(blob);
        }, 'image/png', 1);
    });
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function safeJsonParse(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function formatAnalysis(result) {
    const lines = [];
    lines.push(`요약: ${result.summary || '없음'}`);
    lines.push('');
    lines.push('성분 분석:');

    const ingredients = Array.isArray(result.ingredients) ? result.ingredients : [];
    if (ingredients.length === 0) {
        lines.push('- 성분 항목 없음');
    } else {
        ingredients.forEach((ingredient, index) => {
            lines.push(`${index + 1}. ${ingredient.name || '이름 미상'}`);
            lines.push(`   역할: ${ingredient.role || '미상'}`);
            lines.push(`   위험도: ${ingredient.risk || '불명'}`);
            lines.push(`   메모: ${ingredient.notes || '없음'}`);
        });
    }

    lines.push('');
    lines.push('주의 포인트:');
    const watchouts = Array.isArray(result.watchouts) ? result.watchouts : [];
    if (watchouts.length === 0) {
        lines.push('- 없음');
    } else {
        watchouts.forEach((value) => lines.push(`- ${value}`));
    }

    lines.push('');
    lines.push(`신뢰도: ${result.confidence || '불명'}`);
    lines.push(`면책: ${result.disclaimer || '의료 진단 대체 불가'}`);

    return lines.join('\n');
}
