export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. 跨域配置
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ==========================================
    // 接口 1: 真实的 AI 视觉提取接口
    // ==========================================
    if (request.method === "POST" && url.pathname === "/api/extract") {
      try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        if (!file) throw new Error("没有接收到文件");

        console.log(`📥 开始处理文件: ${file.name}, 大小: ${file.size} bytes`);

        // 1. 将前端传来的文件转换为 Base64 编码 (AI 视觉模型需要)
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64String = btoa(binary);
        const mimeType = file.type;

        // 2. 构造 AI 提示词 (Prompt)
        const systemPrompt = `
          你是一个专业的资质证书与检测报告信息提取专家。
          请从用户上传的图片中，精准提取以下两个字段：
          1. 报告编号 (report_no) - 如果没有，填"无"
          2. 检测单位 (testing_agency) - 发证或检测机构名称
          
          请严格以纯 JSON 格式返回，例如：{"report_no": "XXX", "testing_agency": "YYY"}。不要输出任何 Markdown 标记或多余的解释！
        `;

        // 3. 发起真实的 AI 接口调用 
        // (注：此处以标准的 OpenAI 视觉接口格式为例。如果你用的是阿里通义千问或智谱，只需替换 URL 即可)
        const aiResponse = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.AI_API_KEY}` // 从 .dev.vars 中读取密钥
          },
          body: JSON.stringify({
            model: "deepseek-v4-pro", // 请替换为你实际使用的模型名称 (如 qwen-vl-plus)
            messages: [
              { role: "system", content: systemPrompt },
              { 
                role: "user", 
                content: [
                  { type: "text", text: "请提取这张图片中的证书信息并返回JSON" },
                  { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64String}` } }
                ]
              }
            ],
            response_format: { type: "json_object" } // 强制返回 JSON
          })
        });

        if (!aiResponse.ok) {
          const errData = await aiResponse.text();
          throw new Error(`AI 请求失败: ${errData}`);
        }

        // 4. 解析 AI 返回的数据
        const aiData = await aiResponse.json() as any;
        const extractedJson = JSON.parse(aiData.choices[0].message.content);

        // 5. 补齐前端需要的数据结构
        extractedJson.id = Date.now(); // 生成唯一ID

        console.log("✨ AI 提取成功:", extractedJson);

        return new Response(JSON.stringify({ 
          success: true, 
          data: extractedJson 
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (error: any) {
        console.error("提取失败:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), { 
          status: 500, headers: corsHeaders 
        });
      }
    }

    // ==========================================
    // 接口 2: 批量保存接口 (保持不变)
    // ==========================================
    if (request.method === "POST" && url.pathname === "/api/save") {
      try {
        const changes = await request.json() as any[];
        console.log("💾 准备入库的数据:", changes);
        await new Promise(resolve => setTimeout(resolve, 800));
        return new Response(JSON.stringify({ success: true, message: `成功处理了 ${changes.length} 条记录！` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response("后端 Worker 运行正常！", { headers: corsHeaders });
  },
};