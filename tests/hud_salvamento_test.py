"""O editor só confirma quando o armazenamento realmente aceitou o layout."""
import asyncio
from comum import abre, rt, async_playwright, Placar


async def principal():
    placar = Placar('HUD · falha de armazenamento')
    async with async_playwright() as pw:
        browser, page, erros = await abre(pw, w=896, h=414, config={'experimental': True, 'presente': False})
        try:
            await rt(page, 'jogar(); abrirEdicao(); true')
            await page.evaluate("() => { Storage.prototype.setItem = function(){ throw new DOMException('sem espaço', 'QuotaExceededError'); }; return true; }")
            estado = await rt(page, "hud.power.a=.51; fecharEdicao(true); JSON.stringify({aberto:editing, aviso:X49UI.toast.textContent})")
            import json
            dados = json.loads(estado)
            placar.confere(dados['aberto'] and 'Não foi possível salvar' in dados['aviso'], 'falha mantém editor aberto e explica o motivo', dados)
            await rt(page, 'fecharEdicao(false); true')
            placar.confere(await rt(page, 'editing') is False, 'cancelar ainda fecha o editor')
            placar.confere(not erros, 'nenhum erro de JavaScript', erros)
        finally:
            await browser.close()
    return placar.fim()


if __name__ == '__main__':
    raise SystemExit(asyncio.run(principal()))
