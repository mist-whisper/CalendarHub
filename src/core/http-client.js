/**
 * src/core/http-client.js
 * 统一网络请求客户端，内置重试与错误拦截
 */

/**
 * 带有指数退避重试功能的 JSON 请求函数
 * @param {string} url 请求地址
 * @param {object} options fetch 参数 (headers, method等)
 * @param {number} retries 最大重试次数
 * @param {number} delayMs 基础重试延迟 (毫秒)
 * @returns {Promise<object>} 返回解析后的 JSON 数据
 */
async function fetchJsonWithRetry(url, options = {}, retries = 3, delayMs = 1500) {
  const defaultHeaders = {
    'User-Agent': 'CalendarHub-Bot/1.0',
    'Accept': 'application/json',
    ...options.headers
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers: defaultHeaders });
      
      if (!response.ok) {
        throw new Error(`HTTP 异常 [${response.status}] ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(`[HttpClient] 请求失败 (${url}) - 尝试 ${attempt}/${retries}: ${error.message}`);

      if (attempt === retries) {
        throw new Error(`[HttpClient] 最终请求失败: ${error.message}`);
      }

      // 等待后重试 (指数退避)
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
}

module.exports = {
  fetchJsonWithRetry
};