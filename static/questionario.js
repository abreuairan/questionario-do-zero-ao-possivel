/* ============================================================
   QUESTIONÁRIO - comportamento dos cartões

   - só um bloco fica aberto por vez;
   - um bloco só é liberado quando os anteriores estão respondidos
     (campos obrigatórios preenchidos);
   - "Continuar" (ou Enter) abre o próximo bloco;
   - a barra do topo mostra quantos blocos já foram respondidos;
   - "Selecione até 3" é respeitado (o 4º item fica desativado);
   - perguntas opcionais: o bloco só conta como feito se tiver resposta ou se a pessoa passou por ele.
   ============================================================ */

(function () {
    'use strict';

    var form = document.getElementById('formQuestionario');
    var barra = document.getElementById('barraProgresso');
    if (!form || !barra) { return; }

    var blocos = Array.prototype.slice.call(form.querySelectorAll('.bloco'));
    /* pergunta "Você já tem o livro?" (fica antes do bloco 01, fora da contagem) */
    var inicial = document.getElementById('perguntaInicial');
    var textoProgresso = document.getElementById('progBlocos');
    var preenchimento = document.getElementById('progPreenchimento');
    /* no fim da parte 1 há DOIS botões de envio (terminar / continuar para a parte 2) */
    var botoesEnviar = Array.prototype.slice.call(form.querySelectorAll('.btn-enviar'));
    var textosOriginais = botoesEnviar.map(function (b) { return b.innerHTML; });
    var botaoClicado = null;
    var enviando = false;
    var reduzMovimento = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* ---------- utilidades ---------- */
    function campos(bloco) {
        return Array.prototype.slice.call(bloco.querySelectorAll('input, textarea, select'));
    }

    function primeiroInvalido(bloco) {
        var lista = campos(bloco);
        for (var i = 0; i < lista.length; i++) {
            if (!lista[i].checkValidity()) { return lista[i]; }
        }
        return null;
    }

    function valido(bloco) { return primeiroInvalido(bloco) === null; }

    /* o bloco tem alguma resposta marcada ou escrita? (perguntas opcionais não contam como "feitas" sem isso) */
    function temResposta(bloco) {
        return campos(bloco).some(function (c) {
            if (c.disabled || c.type === 'hidden') { return false; }
            return (c.type === 'checkbox' || c.type === 'radio') ? c.checked : c.value.trim() !== '';
        });
    }

    /* "feito" = sem obrigatório faltando E (tem resposta OU a pessoa já passou por ele com o botão Continuar) */
    function feito(bloco) { return valido(bloco) && (temResposta(bloco) || bloco.getAttribute('data-visitado') === '1'); }

    /* a pergunta inicial já foi respondida? (se ela não existir na página, conta como sim) */
    function inicialOk() { return !inicial || valido(inicial); }

    function animar(bloco, classe, ms) {
        bloco.classList.remove(classe);
        void bloco.offsetWidth; /* reinicia a animação */
        bloco.classList.add(classe);
        window.setTimeout(function () { bloco.classList.remove(classe); }, ms);
    }

    /* ---------- estado: bloqueado / concluído / progresso ---------- */
    function atualizar() {
        /* o bloco 01 só fica liberado depois da pergunta inicial */
        var liberado = inicialOk();
        var contando = true;
        var concluidos = 0;

        blocos.forEach(function (bloco) {
            var ok = valido(bloco);
            var estavaBloqueado = bloco.classList.contains('bloqueado');
            var bloqueado = !liberado;

            bloco.classList.toggle('bloqueado', bloqueado);
            bloco.classList.toggle('concluido', feito(bloco) && !bloco.open);
            bloco.querySelector('summary').setAttribute('aria-disabled', bloqueado ? 'true' : 'false');

            if (bloqueado && bloco.open) { bloco.open = false; }
            if (estavaBloqueado && !bloqueado) { animar(bloco, 'recem-liberado', 1300); }

            var botao = bloco.querySelector('.btn-continuar');
            if (botao) { botao.setAttribute('aria-disabled', ok ? 'false' : 'true'); }

            if (contando && feito(bloco)) { concluidos++; } else { contando = false; }
            liberado = liberado && ok;
        });

        textoProgresso.textContent = concluidos;
        preenchimento.style.width = (concluidos / blocos.length * 100) + '%';
        barra.setAttribute('aria-valuenow', concluidos);
    }

    function abrir(bloco, rolar) {
        blocos.forEach(function (outro) { if (outro !== bloco) { outro.open = false; } });
        bloco.open = true;
        atualizar();
        if (rolar) {
            bloco.scrollIntoView({ behavior: reduzMovimento ? 'auto' : 'smooth', block: 'start' });
        }
    }

    function avancar(indice) {
        var invalido = primeiroInvalido(blocos[indice]);
        if (invalido) {
            invalido.reportValidity(); /* mostra o aviso do navegador no campo que falta */
            return;
        }
        blocos[indice].setAttribute('data-visitado', '1');
        if (blocos[indice + 1]) { abrir(blocos[indice + 1], true); } else { atualizar(); }
    }

    /* ---------- cliques no título do cartão ---------- */
    blocos.forEach(function (bloco) {
        bloco.querySelector('summary').addEventListener('click', function (e) {
            e.preventDefault();
            if (bloco.classList.contains('bloqueado')) { animar(bloco, 'tremer', 500); return; }
            if (bloco.open) { bloco.open = false; atualizar(); } else { abrir(bloco, true); }
        });
    });

    /* ---------- botão Continuar ---------- */
    form.addEventListener('click', function (e) {
        var botao = e.target.closest ? e.target.closest('.btn-continuar') : null;
        if (!botao) { return; }
        avancar(blocos.indexOf(botao.closest('.bloco')));
    });

    /* Enter num campo = Continuar (não envia o formulário sem querer) */
    form.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter' || !e.target.matches('input')) { return; }
        e.preventDefault();
        var indice = blocos.indexOf(e.target.closest('.bloco'));
        if (indice === -1) { return; }   /* Enter na pergunta inicial: não faz nada */
        if (indice < blocos.length - 1) { avancar(indice); }
    });

    /* ---------- pergunta inicial: "Você já tem o livro?" ---------- */
    if (inicial) {
        var retornos = Array.prototype.slice.call(inicial.querySelectorAll('.pergunta-inicial-retorno'));

        inicial.addEventListener('change', function (e) {
            /* mostra só a mensagem que combina com a opção marcada (data-para = id da opção) */
            retornos.forEach(function (p) { p.hidden = p.getAttribute('data-para') !== e.target.id; });

            /* na primeira resposta, abre o bloco 01 sozinho.
               A espera de 0,6 s dá tempo de a pessoa ler a mensagem antes de a tela rolar. */
            var algumAberto = blocos.some(function (b) { return b.open; });
            if (!algumAberto) {
                window.setTimeout(function () { abrir(blocos[0], true); }, reduzMovimento ? 0 : 600);
            }
        });
    }

    /* ---- CONTATO VERDADEIRO: avisa na hora (sem perder as respostas) quando e-mail ou WhatsApp não podem existir ---- */
    var DDDS = [11,12,13,14,15,16,17,18,19,21,22,24,27,28,31,32,33,34,35,37,38,41,42,43,44,45,46,47,48,49,51,53,54,55,61,62,63,64,65,66,67,68,69,71,73,74,75,77,79,81,82,83,84,85,86,87,88,89,91,92,93,94,95,96,97,98,99];
    var BARRADOS = ['mailinator.com','10minutemail.com','guerrillamail.com','tempmail.com','temp-mail.org','yopmail.com','trashmail.com','sharklasers.com','getnada.com','maildrop.cc','dispostable.com','throwawaymail.com','fakeinbox.com','mailnesia.com','mohmal.com','emailondeck.com','example.com','example.org','test.com','teste.com','teste.com.br'];
    var COM_ERRO = ['gmial.com','gmai.com','gmail.con','gmail.co','gamil.com','gnail.com','gmil.com','gmail.cm','gmail.com.br','hotmial.com','hotmai.com','hotmail.con','hotmail.co','hotmal.com','outlok.com','outlook.con','yaho.com','yahoo.con','yahooo.com','icloud.con','uol.com'];
    var FALSOS = ['teste','test','asdf','qwerty','aaaa','abc','abcd','xxx','nao','naotenho','fake','email'];
    function erroEmail(v) {
        v = (v || '').trim().toLowerCase();
        if (!/^[a-z0-9._%+\-]{1,64}@([a-z0-9\-]+\.)+[a-z]{2,24}$/.test(v) || v.indexOf('..') !== -1) { return 'Esse e-mail parece incompleto. Confira se está no formato nome@provedor.com.'; }
        var p = v.split('@'), usuario = p[0], dominio = p[1];
        if (COM_ERRO.indexOf(dominio) !== -1) { return 'Confira o final do seu e-mail: parece haver um errinho de digitação.'; }
        if (BARRADOS.indexOf(dominio) !== -1 || FALSOS.indexOf(usuario) !== -1) { return 'Use o seu e-mail de verdade: é nele que você vai receber o presente.'; }
        if (usuario.length > 3 && usuario.split('').every(function (c) { return c === usuario[0]; })) { return 'Use o seu e-mail de verdade: é nele que você vai receber o presente.'; }
        return '';
    }
    function erroWhats(v) {
        var d = (v || '').replace(/\D/g, '');
        if (d.indexOf('55') === 0 && (d.length === 12 || d.length === 13)) { d = d.slice(2); }
        var ddd, resto;
        if (d.length === 11) {
            ddd = parseInt(d.slice(0, 2), 10); resto = d.slice(2);
            if (resto.charAt(0) !== '9') { return 'Celular com DDD tem 9 dígitos e começa com 9. Confira o número.'; }
        } else if (d.length === 10) {
            ddd = parseInt(d.slice(0, 2), 10); resto = d.slice(2);
            if ('2345'.indexOf(resto.charAt(0)) === -1) { return 'Esse número parece incompleto. Informe DDD + número (ex.: 11 91234-5678).'; }
        } else { return 'Informe o WhatsApp com DDD, por exemplo (11) 91234-5678.'; }
        if (DDDS.indexOf(ddd) === -1) { return 'Esse DDD não existe. Confira o número.'; }
        var distintos = {}; resto.split('').forEach(function (c) { distintos[c] = 1; });
        if (Object.keys(distintos).length <= 2 || ['123456789', '987654321', '12345678', '87654321'].indexOf(resto) !== -1) { return 'Esse número parece inventado. Informe o seu WhatsApp de verdade.'; }
        return '';
    }
    var campoEmail = form.querySelector('[name="email"]'), campoWhats = form.querySelector('[name="whatsapp"]');
    function conferirContato() {
        if (campoEmail) { campoEmail.setCustomValidity(campoEmail.value ? erroEmail(campoEmail.value) : ''); }
        if (campoWhats) { campoWhats.setCustomValidity(campoWhats.value ? erroWhats(campoWhats.value) : ''); }
    }
    form.addEventListener('input', conferirContato);
    conferirContato();

    form.addEventListener('input', atualizar);
    form.addEventListener('change', atualizar);

    /* ---------- envio ---------- */
    botoesEnviar.forEach(function (botao) {
        botao.addEventListener('click', function (e) {
            if (enviando) { e.preventDefault(); return; }
            if (!inicialOk()) {   /* faltou a pergunta inicial: leva a pessoa até ela */
                e.preventDefault();
                primeiroInvalido(inicial).reportValidity();
                return;
            }
            for (var i = 0; i < blocos.length; i++) {
                var invalido = primeiroInvalido(blocos[i]);
                if (invalido) {
                    e.preventDefault();
                    abrir(blocos[i], false);
                    invalido.reportValidity();
                    return;
                }
            }
            botaoClicado = botao;
        });
    });

    form.addEventListener('submit', function () {
        enviando = true;
        botoesEnviar.forEach(function (botao) {
            /* aria-disabled (e não "disabled"): o botão apertado precisa continuar valendo no envio */
            botao.setAttribute('aria-disabled', 'true');
            if (botao === botaoClicado) { botao.textContent = 'Enviando…'; }
        });
    });

    /* voltar pelo botão "Voltar" do navegador: libera os botões de novo */
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            enviando = false;
            botoesEnviar.forEach(function (botao, i) {
                botao.innerHTML = textosOriginais[i];
                botao.removeAttribute('aria-disabled');
            });
        }
    });

    /* ---------- "Outro: especificar" (campo curto aparece só quando a opção Outro está marcada) ---------- */
    Array.prototype.forEach.call(form.querySelectorAll('[data-outro-de]'), function (caixaOutro) {
        var nome = caixaOutro.getAttribute('data-outro-de');
        var entrada = caixaOutro.querySelector('input');
        function mostrar() {
            var marcado = Array.prototype.some.call(form.querySelectorAll('input[name="' + nome + '"]'), function (c) {
                return c.checked && c.value === 'Outro';
            });
            caixaOutro.hidden = !marcado;
            entrada.disabled = !marcado;
            if (!marcado) { entrada.value = ''; }
        }
        form.addEventListener('change', function (e) { if (e.target.name === nome) { mostrar(); } });
        mostrar();
    });

    /* ---------- limite de escolhas ("Selecione até 3") ---------- */
    Array.prototype.forEach.call(form.querySelectorAll('[data-max]'), function (grupo) {
        var max = parseInt(grupo.getAttribute('data-max'), 10);
        var caixas = Array.prototype.slice.call(grupo.querySelectorAll('input[type="checkbox"]'));
        var contador = grupo.parentNode.querySelector('.contador');

        function aplicar() {
            var marcadas = caixas.filter(function (c) { return c.checked; }).length;
            caixas.forEach(function (c) {
                var bloquear = !c.checked && marcadas >= max;
                c.disabled = bloquear;
                c.closest('.opcao').classList.toggle('desativada', bloquear);
            });
            if (contador) {
                contador.textContent = marcadas + ' de ' + max + (marcadas === 1 ? ' escolhida' : ' escolhidas');
            }
        }

        grupo.addEventListener('change', aplicar);
        aplicar();
    });

    /* ---------- barra de progresso fixa logo abaixo do menu ---------- */
    function medirTopo() {
        var nav = document.querySelector('.navbar');
        var alturaMenu = 0;
        barra.style.marginTop = '0px';

        if (nav) {
            var posicao = window.getComputedStyle(nav).position;
            if (posicao === 'fixed' || posicao === 'sticky') { alturaMenu = nav.offsetHeight; }
            if (posicao === 'fixed' && barra.nextElementSibling) {
                /* menu fixo sobre a página: empurra a barra para não ficar escondida atrás dele */
                var topoNatural = barra.nextElementSibling.getBoundingClientRect().top
                    + window.pageYOffset - barra.offsetHeight;
                if (topoNatural < alturaMenu) { barra.style.marginTop = (alturaMenu - topoNatural) + 'px'; }
            }
        }

        barra.style.top = alturaMenu + 'px';
        document.documentElement.style.setProperty('--altura-topo', (alturaMenu + barra.offsetHeight) + 'px');
    }

    window.addEventListener('resize', medirTopo);
    window.addEventListener('load', medirTopo);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(medirTopo); }

    atualizar();
    medirTopo();
})();
