module.exports = (req, res) => {
    // Vercel 환경 변수 'bubble'을 읽어와서 JSON으로 응답합니다.
    res.status(200).json({
        apiKey: process.env.bubble || ''
    });
};
