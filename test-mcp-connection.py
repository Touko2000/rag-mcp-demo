#!/usr/bin/env python3
"""
测试 MCP 连接功能
打开浏览器，点击"配置"按钮，捕获控制台日志
"""

from playwright.sync_api import sync_playwright
import time

def test_mcp_connection():
    with sync_playwright() as p:
        # 启动浏览器
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        
        # 捕获控制台日志
        console_logs = []
        def handle_console(msg):
            console_logs.append(f"[{msg.type}] {msg.text}")
            print(f"[浏览器控制台] [{msg.type}] {msg.text}")
        
        page = context.new_page()
        page.on("console", handle_console)
        
        # 监听页面错误
        def handle_page_error(error):
            print(f"[页面错误] {error}")
        page.on("pageerror", handle_page_error)
        
        # 监听请求失败
        def handle_request_failed(request):
            print(f"[请求失败] {request.url} - {request.failure}")
        page.on("requestfailed", handle_request_failed)
        
        # 打开应用
        print("打开应用...")
        page.goto('http://localhost:5173')
        page.wait_for_load_state('networkidle')
        
        # 等待页面加载完成
        time.sleep(2)
        
        # 截图查看当前状态
        page.screenshot(path='/tmp/mcp-before-click.png', full_page=True)
        print("已截图保存到 /tmp/mcp-before-click.png")
        
        # 查找并点击"配置"按钮
        print("\n点击'配置'按钮...")
        try:
            config_button = page.locator('button:has-text("配置")')
            config_button.click()
            print("已点击'配置'按钮")
        except Exception as e:
            print(f"点击'配置'按钮失败: {e}")
            # 尝试查找所有按钮
            buttons = page.locator('button').all()
            print(f"找到 {len(buttons)} 个按钮")
            for i, btn in enumerate(buttons):
                try:
                    text = btn.text_content()
                    print(f"  按钮 {i}: {text}")
                except:
                    pass
        
        # 等待一段时间，让连接建立
        time.sleep(5)
        
        # 截图查看点击后的状态
        page.screenshot(path='/tmp/mcp-after-config.png', full_page=True)
        print("已截图保存到 /tmp/mcp-after-config.png")
        
        # 查找并点击"选择文件夹"按钮
        print("\n点击'选择文件夹'按钮...")
        try:
            folder_button = page.locator('button:has-text("选择文件夹")')
            folder_button.click()
            print("已点击'选择文件夹'按钮")
        except Exception as e:
            print(f"点击'选择文件夹'按钮失败: {e}")
        
        # 等待一段时间
        time.sleep(3)
        
        # 截图查看最终状态
        page.screenshot(path='/tmp/mcp-final.png', full_page=True)
        print("已截图保存到 /tmp/mcp-final.png")
        
        # 打印所有控制台日志
        print("\n=== 浏览器控制台日志 ===")
        for log in console_logs:
            print(log)
        
        # 检查是否有错误
        errors = [log for log in console_logs if 'error' in log.lower() or 'err_aborted' in log.lower()]
        if errors:
            print("\n=== 发现的错误 ===")
            for error in errors:
                print(error)
        else:
            print("\n没有发现错误")
        
        # 关闭浏览器
        browser.close()
        
        return len(errors) == 0

if __name__ == "__main__":
    success = test_mcp_connection()
    print(f"\n测试结果: {'通过' if success else '失败'}")
