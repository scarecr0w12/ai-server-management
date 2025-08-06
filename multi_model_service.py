"""Multi-Model Integration Service for supporting various LLM providers.

This module provides a unified interface for different LLM providers including
OpenAI, Claude (Anthropic), Llama, and others with model-specific adapters.
"""
from __future__ import annotations

import os
import logging
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum

logging.basicConfig(level=logging.INFO, format="[MultiModel] %(message)s")

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False


class ModelProvider(Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    HUGGINGFACE = "huggingface"


@dataclass
class ModelConfig:
    provider: ModelProvider
    model_name: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    max_tokens: int = 2000
    temperature: float = 0.7
    system_prompt_template: Optional[str] = None


class BaseModelAdapter:
    """Base class for model-specific adapters."""
    
    def __init__(self, config: ModelConfig):
        self.config = config
        self.client = None
        
    def initialize(self) -> bool:
        """Initialize the model client. Override in subclasses."""
        raise NotImplementedError
        
    def generate_response(self, prompt: str, **kwargs) -> str:
        """Generate a response from the model. Override in subclasses."""
        raise NotImplementedError
        
    def health_check(self) -> bool:
        """Check if the model is available and responsive."""
        try:
            test_response = self.generate_response("Hello", max_tokens=10)
            return bool(test_response)
        except Exception:
            return False


class OpenAIAdapter(BaseModelAdapter):
    """Adapter for OpenAI models (GPT-3.5, GPT-4, etc.)."""
    
    def initialize(self) -> bool:
        if not OPENAI_AVAILABLE:
            logging.warning("OpenAI library not available")
            return False
            
        try:
            api_key = self.config.api_key or os.getenv('OPENAI_API_KEY')
            if not api_key:
                logging.warning("OpenAI API key not found")
                return False
                
            self.client = OpenAI(
                api_key=api_key,
                base_url=self.config.base_url
            )
            return True
        except Exception as e:
            logging.error(f"Failed to initialize OpenAI client: {e}")
            return False
    
    def generate_response(self, prompt: str, **kwargs) -> str:
        if not self.client:
            return "OpenAI client not initialized"
            
        try:
            response = self.client.chat.completions.create(
                model=self.config.model_name,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=kwargs.get('max_tokens', self.config.max_tokens),
                temperature=kwargs.get('temperature', self.config.temperature)
            )
            return response.choices[0].message.content
        except Exception as e:
            logging.error(f"OpenAI generation failed: {e}")
            return f"Error: {str(e)}"


class AnthropicAdapter(BaseModelAdapter):
    """Adapter for Anthropic Claude models."""
    
    def initialize(self) -> bool:
        if not ANTHROPIC_AVAILABLE:
            logging.warning("Anthropic library not available")
            return False
            
        try:
            api_key = self.config.api_key or os.getenv('ANTHROPIC_API_KEY')
            if not api_key:
                logging.warning("Anthropic API key not found")
                return False
                
            self.client = anthropic.Anthropic(api_key=api_key)
            return True
        except Exception as e:
            logging.error(f"Failed to initialize Anthropic client: {e}")
            return False
    
    def generate_response(self, prompt: str, **kwargs) -> str:
        if not self.client:
            return "Anthropic client not initialized"
            
        try:
            response = self.client.messages.create(
                model=self.config.model_name,
                max_tokens=kwargs.get('max_tokens', self.config.max_tokens),
                temperature=kwargs.get('temperature', self.config.temperature),
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        except Exception as e:
            logging.error(f"Anthropic generation failed: {e}")
            return f"Error: {str(e)}"


class OllamaAdapter(BaseModelAdapter):
    """Adapter for local Ollama models."""
    
    def initialize(self) -> bool:
        if not REQUESTS_AVAILABLE:
            logging.warning("Requests library not available for Ollama")
            return False
            
        self.base_url = self.config.base_url or "http://localhost:11434"
        return True
    
    def generate_response(self, prompt: str, **kwargs) -> str:
        if not hasattr(self, 'base_url'):
            return "Ollama adapter not initialized"
            
        try:
            import requests
            
            data = {
                "model": self.config.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": kwargs.get('temperature', self.config.temperature),
                    "num_predict": kwargs.get('max_tokens', self.config.max_tokens)
                }
            }
            
            response = requests.post(f"{self.base_url}/api/generate", json=data, timeout=30)
            response.raise_for_status()
            
            return response.json().get("response", "No response")
        except Exception as e:
            logging.error(f"Ollama generation failed: {e}")
            return f"Error: {str(e)}"


class HuggingFaceAdapter(BaseModelAdapter):
    """Adapter for Hugging Face Inference API."""
    
    def initialize(self) -> bool:
        if not REQUESTS_AVAILABLE:
            logging.warning("Requests library not available for HuggingFace")
            return False
            
        self.api_key = self.config.api_key or os.getenv('HUGGINGFACE_API_KEY')
        if not self.api_key:
            logging.warning("HuggingFace API key not found")
            return False
            
        self.base_url = "https://api-inference.huggingface.co/models"
        return True
    
    def generate_response(self, prompt: str, **kwargs) -> str:
        if not hasattr(self, 'api_key'):
            return "HuggingFace adapter not initialized"
            
        try:
            import requests
            
            headers = {"Authorization": f"Bearer {self.api_key}"}
            data = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": kwargs.get('max_tokens', self.config.max_tokens),
                    "temperature": kwargs.get('temperature', self.config.temperature)
                }
            }
            
            url = f"{self.base_url}/{self.config.model_name}"
            response = requests.post(url, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            if isinstance(result, list) and len(result) > 0:
                return result[0].get("generated_text", "No response")
            return str(result)
        except Exception as e:
            logging.error(f"HuggingFace generation failed: {e}")
            return f"Error: {str(e)}"


class MultiModelService:
    """Service for managing multiple LLM providers and models."""
    
    def __init__(self):
        self.adapters: Dict[str, BaseModelAdapter] = {}
        self.default_model = None
        self._load_default_configs()
    
    def _load_default_configs(self):
        """Load default model configurations."""
        default_configs = [
            ModelConfig(
                provider=ModelProvider.OPENAI,
                model_name="gpt-3.5-turbo",
                system_prompt_template="server_management"
            ),
            ModelConfig(
                provider=ModelProvider.ANTHROPIC,
                model_name="claude-3-haiku-20240307",
                system_prompt_template="server_management"
            ),
            ModelConfig(
                provider=ModelProvider.OLLAMA,
                model_name="llama2",
                base_url="http://localhost:11434",
                system_prompt_template="server_management"
            ),
            ModelConfig(
                provider=ModelProvider.HUGGINGFACE,
                model_name="microsoft/DialoGPT-medium",
                system_prompt_template="server_management"
            )
        ]
        
        for config in default_configs:
            self.add_model(config)
    
    def add_model(self, config: ModelConfig) -> bool:
        """Add a new model configuration."""
        adapter_classes = {
            ModelProvider.OPENAI: OpenAIAdapter,
            ModelProvider.ANTHROPIC: AnthropicAdapter,
            ModelProvider.OLLAMA: OllamaAdapter,
            ModelProvider.HUGGINGFACE: HuggingFaceAdapter,
        }
        
        if config.provider not in adapter_classes:
            logging.error(f"Unsupported provider: {config.provider}")
            return False
        
        adapter_class = adapter_classes[config.provider]
        adapter = adapter_class(config)
        
        if adapter.initialize():
            model_id = f"{config.provider.value}:{config.model_name}"
            self.adapters[model_id] = adapter
            
            # Set as default if it's the first working model or OpenAI
            if not self.default_model or config.provider == ModelProvider.OPENAI:
                self.default_model = model_id
                
            logging.info(f"Added model {model_id}")
            return True
        else:
            logging.warning(f"Failed to initialize {config.provider.value}:{config.model_name}")
            return False
    
    def generate_response(self, prompt: str, model_id: Optional[str] = None, **kwargs) -> str:
        """Generate a response using the specified or default model."""
        target_model = model_id or self.default_model
        
        if not target_model or target_model not in self.adapters:
            return "No available models configured"
        
        adapter = self.adapters[target_model]
        response = adapter.generate_response(prompt, **kwargs)
        
        # Log model usage for analytics
        logging.info(f"Generated response using {target_model}, length: {len(response)}")
        
        return response
    
    def list_available_models(self) -> List[Dict[str, Any]]:
        """List all available models and their status."""
        models = []
        
        for model_id, adapter in self.adapters.items():
            is_healthy = adapter.health_check()
            models.append({
                "id": model_id,
                "provider": adapter.config.provider.value,
                "model_name": adapter.config.model_name,
                "is_default": model_id == self.default_model,
                "is_healthy": is_healthy,
                "max_tokens": adapter.config.max_tokens,
                "temperature": adapter.config.temperature
            })
        
        return models
    
    def set_default_model(self, model_id: str) -> bool:
        """Set the default model for responses."""
        if model_id in self.adapters:
            self.default_model = model_id
            logging.info(f"Set default model to {model_id}")
            return True
        return False
    
    def health_check_all(self) -> Dict[str, bool]:
        """Check health of all configured models."""
        health_status = {}
        
        for model_id, adapter in self.adapters.items():
            health_status[model_id] = adapter.health_check()
        
        return health_status


# Global multi-model service instance
_multi_model_service = None

def get_multi_model_service() -> MultiModelService:
    """Get or create the global multi-model service instance."""
    global _multi_model_service
    if _multi_model_service is None:
        _multi_model_service = MultiModelService()
    return _multi_model_service
