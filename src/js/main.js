/*
 * Copyright (c) 2013-2016 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/*global $, MashupPlatform, JSONEditor, StyledElements*/

(function () {

    "use strict";

    var MP = MashupPlatform;

    var layout = new StyledElements.BorderLayout();
    layout.insertInto(document.body);
    layout.getNorthContainer().addClassName('header');
    layout.getNorthContainer().wrapperElement.innerHTML = '<h4 class="text-primary">Type: <span id="type-data">No data</span></h4><div id="buttons"></div>';

    var typed = $("#type-data")[0];

    var TEXT = 'textoutput';

    var stack_n = document.createElement('div');
    document.getElementById('buttons').appendChild(stack_n);
    stack_n.className = 'badge badge-info';
    stack_n.textContent = '0';
    var playbtn = new StyledElements.StyledButton({'class': 'btn-danger icon-circle', 'title': 'Start recording events'});
    playbtn.insertInto(document.getElementById('buttons'));
    var runbtn = new StyledElements.StyledButton({'class': 'btn-info icon-fast-forward', 'title': 'Launch all pending events'});
    runbtn.insertInto(document.getElementById('buttons'));
    var stepbtn = new StyledElements.StyledButton({'class': 'btn-info icon-step-forward', 'title': 'Launch current event'});
    stepbtn.insertInto(document.getElementById('buttons'));
    var dropbtn = new StyledElements.StyledButton({'class': 'btn-info icon-trash', 'title': 'Drop current event'});
    dropbtn.insertInto(document.getElementById('buttons'));

    var playing = true;

    var allowsend = false;

    var modes = ['code', 'form', 'text', 'tree', 'view'];

    var options = {
        mode: 'tree',
        modes: modes,
        error: function (err) {
            window.alert(err.toString());
        }
    };

    layout.getCenterContainer().addClassName('jsoncontainer');
    var editor = new JSONEditor(layout.getCenterContainer().wrapperElement, options);

    var stack = [];

    var updateType = function (type) {
        typed.textContent = type;
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
            stack.unshift(d);
            var n = parseInt(stack_n.textContent) + 1;
            stack_n.textContent = n;
            if (stack.length === 1) {
                // first events
                parse_data(d);
            }
            setdisable_btns(false);
        } else {
            parse_data(d);
        }
    };

    var updateStackInfo = function updateStackInfo() {
        stack_n.textContent = stack.length;
        setdisable_btns(stack.length === 0);
    };

    var sendData = function (type, data) {
        if (typeof data === "undefined") {
            var editordata = editor.getText();
            data = stack.pop();

            if (data !== editordata) {
                data = editordata;
            }

            var next = 'No data';
            if (stack.length > 0) {
                next = stack[stack.length - 1];
            } else if (allowsend) {
                next = data;
                stack.push(data);
            }
            updateStackInfo();
            parse_data(next);
        }

        if (data !== "No data") {
            MP.wiring.pushEvent(type, data);
        }
    };

    var change_class = function (elem, c1, c2) {
        elem.removeClassName(c1);
        elem.addClassName(c2);
    };

    var setdisable_btns = function (value) {
        runbtn.setDisabled(value);
        stepbtn.setDisabled(value);
        dropbtn.setDisabled(value);
        if (allowsend) {
            playbtn.setDisabled(true);
            runbtn.setDisabled(true);
            dropbtn.setDisabled(true);
            stepbtn.setDisabled(false);
        }
    };

    var play_proxy = function () {
        playing = true;
        change_class(playbtn, 'icon-stop', 'icon-circle');
        change_class(playbtn, 'btn-success', 'btn-danger');
        run_action();
        playbtn.setTitle('Start recording events');
        parse_data('No data');
        setdisable_btns(true);
    };

    var pause_proxy = function () {
        parse_data('No data');
        playing = false;
        change_class(playbtn, 'icon-circle', 'icon-stop');
        change_class(playbtn, 'btn-danger', 'btn-success');
        playbtn.setTitle('Stop recording events (Launch all pending events)');
    };

    var play_action = function () {
        if (playing) {
            pause_proxy();
        } else {
            play_proxy();
        }
    };

    var run_action = function () {
        while (stack.length > 0) {
            sendData(TEXT);
        }
    };

    var step_action = function () {
        sendData(TEXT);
    };


    var drop_action = function () {
        if (stack.length > 0) {
            stack.shift();
            var next = 'No data';
            if (stack.length > 0) {
                next = stack[stack.length - 1];
            }
            updateStackInfo();
            parse_data(next);
        }
    };

    setdisable_btns(true);
    updateContent('No data');

    playbtn.addEventListener("click", play_action);
    runbtn.addEventListener('click', run_action);
    stepbtn.addEventListener('click', step_action);
    dropbtn.addEventListener('click', drop_action);

    layout.repaint();

    MP.wiring.registerCallback('textinput', function (data) {
        updateContent(data);
        if (playing) {
            sendData(TEXT, data);
        }
    });

    MP.widget.context.registerCallback(function (new_values) {
        layout.repaint();
    });

    var loadprefs = function loadprefs(data) {
        if (typeof data === "undefined") {
            data = {};
            data.allowsend = MP.prefs.get("allowsend");
        }

        if ('allowsend' in data) {
            allowsend = data.allowsend;
            if (data.allowsend) {
                pause_proxy();
                updateContent("{}");
                setdisable_btns(true);
            } else {
                drop_action();
                play_proxy();
            }
        }
    };

    MP.prefs.registerCallback(loadprefs);
    $(document).ready(function () {loadprefs();});
})();
