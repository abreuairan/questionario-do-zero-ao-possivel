/* ============================================================
   MENU LATERAL (☰) - abrir e fechar

   Abre pelo botão de 3 riscos. Fecha pelo X, clicando no fundo escuro,
   com a tecla Esc ou ao escolher uma página. Teclado: o Tab fica preso
   dentro do menu enquanto ele está aberto.
   ============================================================ */

(function () {
    'use strict';

    var botao = document.getElementById('menuBotao');
    var menu = document.getElementById('menuLateral');
    var fundo = document.getElementById('menuFundo');
    var fechar = document.getElementById('menuFechar');
    if (!botao || !menu || !fundo || !fechar) { return; }

    var raiz = document.documentElement;
    var aberto = false;

    function focaveis() {
        return Array.prototype.slice.call(menu.querySelectorAll('a[href], button:not([disabled])'));
    }

    function abrir() {
        aberto = true;
        raiz.classList.add('menu-aberto');
        botao.setAttribute('aria-expanded', 'true');
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-modal', 'true');
        window.setTimeout(function () { fechar.focus(); }, 30);
    }

    function fecharMenu(devolverFoco) {
        aberto = false;
        raiz.classList.remove('menu-aberto');
        botao.setAttribute('aria-expanded', 'false');
        menu.removeAttribute('role');
        menu.removeAttribute('aria-modal');
        if (devolverFoco !== false) { botao.focus(); }
    }

    botao.addEventListener('click', function () { if (aberto) { fecharMenu(); } else { abrir(); } });
    fechar.addEventListener('click', function () { fecharMenu(); });
    fundo.addEventListener('click', function () { fecharMenu(); });

    /* clicar num link que aponta para a página em que você já está
       (ex.: "Início" ou "Responda o questionário" estando na página única):
       não recarrega; fecha o menu e rola suavemente até o destino.
       Assim não se perde o que já foi preenchido no questionário. */
    menu.addEventListener('click', function (e) {
        var link = e.target.closest ? e.target.closest('a') : null;
        if (!link) { return; }
        var destino = new URL(link.href, window.location.href);
        if (destino.pathname !== window.location.pathname) { return; }   // outra página: segue normal

        e.preventDefault();
        fecharMenu(false);
        var alvo = destino.hash ? document.getElementById(destino.hash.slice(1)) : null;
        var suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.setTimeout(function () {
            if (alvo) { alvo.scrollIntoView({ behavior: suave ? 'smooth' : 'auto', block: 'start' }); }
            else { window.scrollTo({ top: 0, behavior: suave ? 'smooth' : 'auto' }); }
            if (window.history && history.replaceState) { history.replaceState(null, '', destino.pathname + destino.hash); }
        }, 60);
    });

    document.addEventListener('keydown', function (e) {
        if (!aberto) { return; }
        if (e.key === 'Escape') { fecharMenu(); return; }
        if (e.key === 'Tab') {
            var lista = focaveis();
            if (!lista.length) { return; }
            var primeiro = lista[0];
            var ultimo = lista[lista.length - 1];
            if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
        }
    });

    /* voltar pelo botão "Voltar" do navegador: nunca reaparece com o menu aberto */
    window.addEventListener('pageshow', function () { if (aberto) { fecharMenu(false); } });
})();
