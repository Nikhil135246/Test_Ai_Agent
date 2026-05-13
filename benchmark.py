#!/usr/bin/env python3
"""
🚀 AI Model Benchmark Dashboard
Unified testing framework for multiple AI APIs (GitHub, NVIDIA NIM, etc.)
Supports parallel testing, comparison reports, and performance analytics.
"""

import asyncio
import aiohttp
import json
import os
import time
import sys
from typing import Optional, Dict, List, Tuple
from datetime import datetime
from statistics import mean, stdev

# ──────────────────────────────────────────────
#  API CONFIGURATION
# ──────────────────────────────────────────────

GITHUB_TOKEN = os.getenv("GITHUB_TOKEN", "")
NIM_API_KEY = os.getenv("NIM_API_KEY", os.getenv("NVIDIA_API_KEY", ""))

GITHUB_ENDPOINT = "https://models.inference.ai.azure.com/chat/completions"
NIM_ENDPOINT = os.getenv("NIM_ENDPOINT", "https://integrate.api.nvidia.com/v1/chat/completions")

GITHUB_HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Content-Type": "application/json",
}

NIM_HEADERS = {
    "Authorization": f"Bearer {NIM_API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# ──────────────────────────────────────────────
#  TEST CONFIGURATION
# ──────────────────────────────────────────────

MODELS = {
    "github": {
        "endpoint": GITHUB_ENDPOINT,
        "headers": GITHUB_HEADERS,
        "models": ["gpt-4o-mini"],
        "tokens_key": "max_completion_tokens",
    },
    "nvidia": {
        "endpoint": NIM_ENDPOINT,
        "headers": NIM_HEADERS,
        "models": ["deepseek-ai/deepseek-v4-pro", "moonshotai/kimi-k2.6", "qwen/qwen3-coder-480b-a35b-instruct"],
        "tokens_key": "max_tokens",
    }
}

PROMPTS = [
    "In one sentence, what is the capital of France?",
    "Explain quantum computing in 20 words.",
    "What is the largest planet in our solar system?",
]

PARALLEL_CALLS = 3


# ──────────────────────────────────────────────
#  DATA STRUCTURES & RESULTS
# ──────────────────────────────────────────────

class BenchmarkResult:
    def __init__(self, provider: str, model: str, prompt: str):
        self.provider = provider
        self.model = model
        self.prompt = prompt
        self.response = ""
        self.duration = 0.0
        self.tokens_used = 0
        self.success = False
        self.error = ""

    def __repr__(self):
        status = "✅" if self.success else "❌"
        return f"{status} {self.model:40} | {self.duration:.3f}s | {self.response[:50]}"


# ──────────────────────────────────────────────
#  API CALL FUNCTIONS
# ──────────────────────────────────────────────

async def call_github_model(session: aiohttp.ClientSession, model: str, prompt: str) -> BenchmarkResult:
    """Call GitHub Models API."""
    result = BenchmarkResult("github", model, prompt)
    
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_completion_tokens": 128,
    }

    try:
        t_start = time.perf_counter()
        async with session.post(GITHUB_ENDPOINT, headers=GITHUB_HEADERS, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            body = await resp.json(content_type=None)
            result.duration = time.perf_counter() - t_start

            if resp.status >= 400:
                error_msg = body.get("error", {}).get("message", json.dumps(body))
                result.error = f"HTTP {resp.status}: {error_msg}"
                return result

            result.response = body["choices"][0]["message"]["content"].strip()
            result.tokens_used = body.get("usage", {}).get("total_tokens", 0)
            result.success = True
    except Exception as e:
        result.error = str(e)
        result.duration = time.perf_counter() - t_start

    return result


async def call_nvidia_model(session: aiohttp.ClientSession, model: str, prompt: str) -> BenchmarkResult:
    """Call NVIDIA NIM API."""
    result = BenchmarkResult("nvidia", model, prompt)
    
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 128,
    }

    try:
        t_start = time.perf_counter()
        async with session.post(NIM_ENDPOINT, headers=NIM_HEADERS, json=payload, timeout=aiohttp.ClientTimeout(total=30)) as resp:
            body = await resp.json(content_type=None)
            result.duration = time.perf_counter() - t_start

            if resp.status >= 400:
                error_msg = body.get("error", {}).get("message", json.dumps(body))
                result.error = f"HTTP {resp.status}: {error_msg}"
                return result

            result.response = body["choices"][0]["message"]["content"].strip()
            result.tokens_used = body.get("usage", {}).get("total_tokens", 0)
            result.success = True
    except Exception as e:
        result.error = str(e)
        result.duration = time.perf_counter() - t_start

    return result


# ──────────────────────────────────────────────
#  BENCHMARK ENGINE
# ──────────────────────────────────────────────

async def run_benchmark() -> List[BenchmarkResult]:
    """Run parallel benchmark tests across all models and prompts."""
    results = []
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        
        # Create tasks for all prompts across all models
        for provider_name, provider_config in MODELS.items():
            for model in provider_config["models"]:
                for prompt in PROMPTS:
                    if provider_name == "github":
                        task = call_github_model(session, model, prompt)
                    else:  # nvidia
                        task = call_nvidia_model(session, model, prompt)
                    tasks.append(task)
        
        # Run all tasks concurrently
        results = await asyncio.gather(*tasks)
    
    return results


# ──────────────────────────────────────────────
#  REPORTING & VISUALIZATION
# ──────────────────────────────────────────────

def print_header(text: str):
    """Print a formatted header."""
    width = 80
    print(f"\n{'=' * width}")
    print(f"  {text.center(width - 4)}")
    print(f"{'=' * width}\n")


def print_results(results: List[BenchmarkResult]):
    """Print results in a nice table format."""
    print_header("🎯 BENCHMARK RESULTS")
    
    for result in results:
        status = "✅" if result.success else "❌"
        print(f"{status} {result.model:45} | {result.duration:7.3f}s | {result.response[:45]:45}")
        if result.error:
            print(f"   └─ ERROR: {result.error}")


def generate_report(results: List[BenchmarkResult]) -> Dict:
    """Generate detailed statistics and comparison report."""
    report = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": len(results),
        "successful": sum(1 for r in results if r.success),
        "failed": sum(1 for r in results if not r.success),
        "providers": {},
        "models": {},
    }

    # Per-provider stats
    for provider_name, provider_config in MODELS.items():
        provider_results = [r for r in results if r.provider == provider_name]
        successful = [r for r in provider_results if r.success]
        durations = [r.duration for r in successful]
        
        if durations:
            report["providers"][provider_name] = {
                "total": len(provider_results),
                "successful": len(successful),
                "avg_duration": mean(durations),
                "min_duration": min(durations),
                "max_duration": max(durations),
                "stdev": stdev(durations) if len(durations) > 1 else 0,
            }

    # Per-model stats
    model_results = {}
    for result in results:
        key = result.model
        if key not in model_results:
            model_results[key] = []
        if result.success:
            model_results[key].append(result)
    
    for model, model_runs in model_results.items():
        if model_runs:
            durations = [r.duration for r in model_runs]
            report["models"][model] = {
                "runs": len(model_runs),
                "avg_duration": mean(durations),
                "avg_tokens": mean([r.tokens_used for r in model_runs if r.tokens_used]),
                "min_duration": min(durations),
                "max_duration": max(durations),
            }

    return report


def print_report(report: Dict):
    """Print the detailed report."""
    print_header("📊 BENCHMARK REPORT")
    
    print(f"Timestamp: {report['timestamp']}")
    print(f"Total Tests: {report['total_tests']} | ✅ {report['successful']} | ❌ {report['failed']}\n")
    
    if report['providers']:
        print("📍 PROVIDER STATISTICS:")
        for provider, stats in report['providers'].items():
            print(f"\n  {provider.upper()}:")
            print(f"    Tests:     {stats['total']} ({stats['successful']} successful)")
            print(f"    Avg Time:  {stats['avg_duration']:.3f}s")
            print(f"    Range:     {stats['min_duration']:.3f}s - {stats['max_duration']:.3f}s")
            print(f"    StdDev:    {stats['stdev']:.3f}s")
    
    if report['models']:
        print("\n🤖 MODEL PERFORMANCE:")
        sorted_models = sorted(report['models'].items(), key=lambda x: x[1]['avg_duration'])
        for i, (model, stats) in enumerate(sorted_models, 1):
            medal = "🥇" if i == 1 else ("🥈" if i == 2 else ("🥉" if i == 3 else "  "))
            print(f"\n  {medal} {model}")
            print(f"     Avg Time: {stats['avg_duration']:.3f}s (runs: {stats['runs']})")
            print(f"     Avg Tokens: {stats['avg_tokens']:.0f}")
    
    print("\n" + "=" * 80)


def save_report(report: Dict, filename: str = "benchmark_report.json"):
    """Save report to JSON file."""
    with open(filename, 'w') as f:
        json.dump(report, f, indent=2)
    print(f"\n💾 Report saved to: {filename}")


# ──────────────────────────────────────────────
#  MAIN EXECUTION
# ──────────────────────────────────────────────

async def main():
    """Main benchmark execution."""
    print("\n" + "=" * 80)
    print("  🚀 AI MODEL BENCHMARK DASHBOARD".center(80))
    print("=" * 80)
    print(f"\n⏱️  Testing {len(MODELS['github']['models']) + len(MODELS['nvidia']['models'])} models x {len(PROMPTS)} prompts = {(len(MODELS['github']['models']) + len(MODELS['nvidia']['models'])) * len(PROMPTS)} tests\n")
    
    # Run benchmarks
    start_time = time.time()
    results = await run_benchmark()
    total_time = time.time() - start_time
    
    # Display results and report
    print_results(results)
    report = generate_report(results)
    print_report(report)
    
    # Summary
    print(f"\n⏱️  Total execution time: {total_time:.2f}s")
    print(f"📈 Average time per test: {total_time / len(results):.3f}s\n")
    
    # Save report
    save_report(report)


if __name__ == "__main__":
    asyncio.run(main())
