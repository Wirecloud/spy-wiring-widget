/*global $,  MashupPlatform, JSONEditor*/
(function () {
    "use strict";

    var send = true;
    var typed = $("#type-data");
    // var contentd = $("#content-data")[0];

    var TEXT = 'textoutput';

    var playunicode = '&#9654;';
    var pauseunicode = '&#9646;&#9646;';

    var playbtn = $('#playbtn');
    var runbtn = $('#runbtn');
    var stepbtn = $('#stepbtn');
    var dropbtn = $('#dropbtn');
    var stack_n = $('#stack-n');

    var playing = true;

    var modes = ['code', 'form', 'text', 'tree', 'view'];

    var options = {
        mode: 'tree',
        modes: modes,
        error: function (err) {
            window.alert(err.toString());
        }
    };

    var container = document.getElementById("jsoneditor");
    var editor = new JSONEditor(container, options);

    var stack = [];

    var updateType = function (type) {
        typed.text(type);
    };

    var parse_data = function (d) {
        try {
            var tmp = JSON.parse(d);
            updateType("JSON - (Text)");
            editor.options.modes = modes;
            editor.set(tmp);
            if (editor.options.mode === "text") {
                editor.setMode("tree");
            }
            if (editor.options.mode !== 'code') {
                editor.expandAll();
            }
        } catch (err) {
            updateType("Text");
            editor.options.modes = ['text'];
            editor.setMode('text');
            editor.setText(d);
        }
    };

    var updateContent = function (d) {
        if (!playing) {
            stack.push(d);
            var n = parseInt(stack_n.text()) + 1;
            stack_n.text(n);
        } else {
            parse_data(d);
        }
    };

    var loadPrefs = function () {
        send = MashupPlatform.prefs.get('MITM');
    };

    var sendData = function (type, data) {
        if (send) {
            if (typeof data === "undefined") {
                data = editor.getText();
                var next = 'No data';
                if (stack.length > 0) {
                    next = stack.shift();
                    var n = parseInt(stack_n.text()) - 1;
                    stack_n.text(n);
                }
                parse_data(next);
            }
            if (data !== "No data") {
                MashupPlatform.wiring.pushEvent(type, data);
            }
        }
    };

    var change_class = function (elem, c1, c2) {
        elem.removeClass(c1);
        elem.addClass(c2);
    };

    var setdisable_btns = function (value) {
        runbtn.prop('disabled', value);
        stepbtn.prop('disabled', value);
        dropbtn.prop('disabled', value);
    };

    var play_proxy = function () {
        playing = true;
        playbtn.html(playunicode);
        change_class(playbtn, 'btn-danger', 'btn-success');
        setdisable_btns(true);

        if (stack.length > 0) {
            while (stack.length > 0) {
                sendData(TEXT);
            }
            parse_data('No data');
        }
    };

    var pause_proxy = function () {
        playing = false;
        playbtn.html(pauseunicode);
        change_class(playbtn, 'btn-success', 'btn-danger');
        setdisable_btns(false);
    };

    var play_action = function () {
        if (playing) {
            pause_proxy();
        } else {
            play_proxy();
        }
    };

    var run_action = function () {

        play_proxy();
    };

    var step_action = function () {
        sendData(TEXT);
    };


    var drop_action = function () {
        var data = editor.getText();
        if (data !== 'No data') {
            var next = 'No data';
            if (stack.length > 0) {
                next = stack.shift();
                var n = parseInt(stack_n.text()) - 1;
                stack_n.text(n);
            }
            parse_data(next);
        }
    };


    updateContent('No data');

    playbtn.on("click", play_action);
    runbtn.on('click', run_action);
    stepbtn.on('click', step_action);
    dropbtn.on('click', drop_action);

    if (typeof MashupPlatform !== 'undefined') {
        MashupPlatform.prefs.registerCallback(function () {
            loadPrefs();
        });

        MashupPlatform.wiring.registerCallback('textinput', function (data) {
            updateContent(data);
            if (playing) {
                sendData(TEXT, data);
            }
        });
    }
})();
