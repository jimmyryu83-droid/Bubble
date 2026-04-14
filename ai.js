import { CONFIG } from './config.js';

class AiManager {
    constructor() {
        this.apiKey = CONFIG.GEMINI_API_KEY;
        this.model = 'gemini-1.5-flash';
        this.isRequesting = false;
        this.messageQueue = [];
        this.messageTimeout = null;
        
        // 서버에서 환경 변수 기반 키 가져오기 시도
        this.initKey();
    }

    async initKey() {
        try {
            const response = await fetch('/api/config');
            const data = await response.json();
            if (data.apiKey) {
                this.apiKey = data.apiKey;
                console.log('AI API Key loaded from server.');
            }
        } catch (e) {
            console.log('Falling back to config.js for API Key.');
        }
    }

    async getAiResponse(prompt, type = 'general') {
        // 키가 로드될 때까지 잠시 대기 (최초 1회 한정)
        if (this.apiKey === 'YOUR_API_KEY_HERE') {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        if (this.apiKey === 'YOUR_API_KEY_HERE' || !this.apiKey) {
            console.warn('AI API Key가 설정되지 않았습니다.');
            return null;
        }

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            const data = await response.json();
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                const aiText = data.candidates[0].content.parts[0].text.trim();
                return aiText;
            }
        } catch (error) {
            console.error('AI API 호출 중 오류 발생:', error);
        }
        return null;
    }

    // NPC 도발 멘트 생성
    async getStageStartDialogue(stage, enemies) {
        const enemyCounts = enemies.reduce((acc, current) => {
            acc[current.type] = (acc[current.type] || 0) + 1;
            return acc;
        }, {});
        
        const enemyString = Object.entries(enemyCounts)
            .map(([type, count]) => `${type} ${count}마리`)
            .join(', ');

        const prompt = `지금 스테이지 ${stage}에 ${enemyString}가 있어. 이들이 플레이어에게 날릴 귀여운 악당 말투의 짧은 한마디(15자 내외)를 한국어로 생성해줘.`;
        return await this.getAiResponse(prompt, 'npc');
    }

    // 플레이어 콤보 평가
    async getComboEvaluation(comboCount) {
        const prompt = `플레이어가 거품으로 적 ${comboCount}마리를 동시에 처치했어! 대단한 실력을 칭찬하는 짧고 유쾌한 감탄사(10자 내외)를 한국어로 생성해줘.`;
        return await this.getAiResponse(prompt, 'bonus');
    }

    // 실시간 코칭 가이드
    async getCoachingAdvice(state) {
        const prompt = `게임 상황: 스테이지 ${state.stage}, 남은 목숨 ${state.lives}, 플레이어 위치 (${state.playerX}, ${state.playerY}), 적 위치 (${state.enemyX}, ${state.enemyY}). 
        플레이어가 현재 구석에 몰렸거나 움직임이 없어. 탈출하거나 적을 공격할 수 있는 짧고 명쾌한 전략 가이드(20자 내외)를 한국어로 생성해줘.`;
        return await this.getAiResponse(prompt, 'coach');
    }

    // 화면에 메시지 표시
    showMessage(text, type = 'ai') {
        const container = document.getElementById('ai-message-container');
        if (!container) return;

        // 기존 메시지 제거
        container.innerHTML = '';
        
        const bubble = document.createElement('div');
        bubble.className = `speech-bubble ${type}`;
        bubble.innerText = text;
        
        container.appendChild(bubble);
        container.style.display = 'block';

        if (this.messageTimeout) clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => {
            container.style.display = 'none';
        }, 4000);
    }
}

export const aiManager = new AiManager();
