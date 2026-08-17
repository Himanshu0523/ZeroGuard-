import os
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
import httpx

logger = logging.getLogger("zero_guard.llm_client")

class LLMClient:
    """
    Unified, self-hostable LLM client targeting OpenAI-compatible local serving engines
    such as vLLM or Ollama by default, with optional configuration for external providers.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout: float = 60.0
    ):
        self.provider = os.getenv("LLM_PROVIDER", "ollama").lower()
        
        # Default endpoint mapping for popular self-hosted LLM runners
        default_urls = {
            "ollama": "http://localhost:11434/v1",
            "vllm": "http://localhost:8000/v1",
            "openai": "https://api.openai.com/v1",
            "custom": "http://localhost:8000/v1"
        }
        
        self.base_url = base_url or os.getenv("LLM_BASE_URL") or default_urls.get(self.provider, "http://localhost:11434/v1")
        self.api_key = api_key or os.getenv("LLM_API_KEY", "EMPTY")
        self.model = model or os.getenv("LLM_MODEL", "llama3:8b" if self.provider == "ollama" else "meta-llama/Meta-Llama-3-8B-Instruct")
        self.timeout = timeout
        
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

    async def check_health(self) -> bool:
        """Checks if the self-hosted vLLM/Ollama server is reachable."""
        health_url = f"{self.base_url.rstrip('/v1')}/health" if "v1" in self.base_url else f"{self.base_url}/version"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(health_url)
                return res.status_code == 200
        except Exception as e:
            logger.warning(f"Self-hosted LLM server health check failed at {health_url}: {e}")
            return False

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = "You are ZeroGuard AI, an expert application security engineer.",
        temperature: float = 0.2,
        max_tokens: int = 1024,
        **kwargs
    ) -> str:
        """Sends a completion request to the OpenAI-compatible local vLLM/Ollama endpoint."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            **kwargs
        }

        url = f"{self.base_url.rstrip('/')}/chat/completions"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as e:
                logger.error(f"LLM request returned status error {e.response.status_code}: {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Failed to communicate with LLM endpoint ({url}): {e}")
                raise

    async def stream_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = "You are ZeroGuard AI, an expert application security engineer.",
        temperature: float = 0.2,
        max_tokens: int = 1024
    ) -> AsyncGenerator[str, None]:
        """Streams completion tokens from local vLLM/Ollama OpenAI-compatible endpoint."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }

        url = f"{self.base_url.rstrip('/')}/chat/completions"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", url, json=payload, headers=self.headers) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            break
                        try:
                            import json
                            chunk = json.loads(data_str)
                            delta = chunk["choices"][0]["delta"].get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            continue

if __name__ == "__main__":
    import asyncio
    
    async def main():
        client = LLMClient()
        print(f"Provider: {client.provider}")
        print(f"Base URL: {client.base_url}")
        print(f"Model: {client.model}")
        is_healthy = await client.check_health()
        print(f"Endpoint status reachable: {is_healthy}")

    asyncio.run(main())
