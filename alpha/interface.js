
NodeList.prototype.addEventListener = function(evt_type, func) {
    this.forEach(function(node) {
        node.addEventListener(evt_type, func.bind(node));
    });
};

NodeList.prototype.hide = function() {
    this.forEach(function(node) {
        node.hide()
    });
}

HTMLElement.prototype.hide = function() {
    this.style.display = 'none';
}

HTMLElement.prototype.show = function() {
    this.style.display = '';
}

HTMLElement.prototype.click = function(func) {
    if (func)
        this.addEventListener('click', func);
    else
        this.dispatchEvent(new MouseEvent('click'));
}

HTMLElement.prototype.change = function(func) {
    this.addEventListener('change', func);
}

HTMLSelectElement.prototype.getValue = function () {
    return Number(this.value);
}

HTMLSelectElement.prototype.setValue = function (value) {
    let maxvalue = 0;
    for (let i=0; i < this.children.length; i++) {
        if (maxvalue < Number(this.children[i].value))
            maxvalue = Number(this.children[i].value)
    }
    // mask off the bits we don't need
    let mask = Math.pow(2, Math.floor(Math.log2(maxvalue)) + 1) - 1;
    value &= mask;
    for (let i=0; i < this.children.length; i++) {
        if (value == Number(this.children[i].value)) {
            this.selectedIndex = i;
            break;
        }
    }
}

HTMLInputElement.prototype.getValue = function() {
    if (this.type == 'checkbox'){
        if (this.indeterminate)
            return 2;
        else if (this.checked)
            return 1;
        else
            return 0;
    } else {
        return Number(this.value);
    }
}

HTMLInputElement.prototype.setValue = function (value) {
    if (this.type == 'checkbox') {
        if (this.dataset.tristate) {
            value &= 3;
        } else {
            value &= 1;
        }
        this.checked = this.indeterminate = false;
        if (value & 2) {
            this.indeterminate = true;
            this.dataset.indeterminate = true;
        } else if (value & 1) {
            this.checked = true;
        }
    }
}


HTMLInputElement.prototype.triState = function() {
    if (this.type == 'checkbox') {
        this.dataset.tristate = true
        this.change(function(event) {
            if (!this.checked) {
                this.indeterminate = true;
                this.dataset.indeterminate = true;
            } else if (this.dataset.indeterminate) {
                delete this.dataset.indeterminate;
                this.checked = false;
            }
        });
    }
}

String.prototype.basename = function() {
    let index = this.lastIndexOf('/');
    if (index < 0)
        index = this.lastIndexOf('\\');
    return this.substring(index + 1);
}

String.prototype.isNumeric = function() {
    return !!/^[0-9]*(.[0-9]*)?$/.exec(this)
}

class Interface {
    constructor(flagSize) {
        this.flagBytes = new Uint8Array(flagSize);
        this.inputs = [];
        this.appContainer = $('#application');
        this.title = this.create('h1', 'DWRandomizer');
        this.appContainer.append(this.title);
        this.subHeader = this.create('h3');
        this.appContainer.append(this.subHeader);

        this.inputFileDiv = this.create('div', 'Rom File: ', {
            'padding': '0.2em'
        });
        this.inputFile = this.create('input', null, {
            'position': 'absolute',
            'opacity': '0',
            'cursor': 'pointer'
        })
        this.filenameSpan = this.create('span',
            localStorage.getItem('rom_name') || 'No file selected')
        this.inputFile.type = 'file';
        this.inputFileDiv.append(this.inputFile)
        this.inputFileDiv.append(this.filenameSpan);
        this.appContainer.append(this.inputFileDiv);

         let flagsSeed = this.create('div', null, {
            'display': 'grid',
            'grid-template-columns': '50% 50%',
            'padding': '0.2em'
        });
        let flagsDiv = this.create('div', 'Flags: ');
        this.flagsEl = this.create('input', null, {
            'width':  '210px'
        });
        this.flagsEl.value = localStorage.flags || 'IVIAAVCQKACAAAAAAAAAAAAB'
        this.flagsEl.change(event => {
            this.updateFlagBytes();
            this.updateInputs();
        });
        this.updateFlagBytes();
        flagsDiv.append(this.flagsEl);
        flagsSeed.append(flagsDiv);

        let seedDiv = this.create('div', 'Seed: ')
        this.seedEl = this.create('input');
        this.seedEl.value = new String(
            Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        seedDiv.append(this.seedEl);
        this.seedButton = this.create('button', 'Random Seed');
        seedDiv.append(this.seedButton);
        flagsSeed.append(seedDiv);
        this.appContainer.append(flagsSeed)

        this.tabBar = this.create('tabbar', null, {
            'padding-top': '0.5em'
        });
        this.appContainer.append(this.tabBar);
        this.tabContainer = this.create('tabcontainer');
        this.appContainer.append(this.tabContainer);
        this.tabs = {};
        let goContainer = this.create('div', null, {
            'text-align': 'right',
            'padding-top': '0.5em'
        });
        this.goButton = this.create('button', 'Randomize!');
        goContainer.append(this.goButton);
        this.appContainer.append(goContainer);
        this.initEvents();
    }

    create(element, text, style) {
        let el = document.createElement(element);
        if (text)
            el.innerText = text
        if (style) {
            for (key in style)
                el.style[key] = style[key];
        }
        return el;
    }

    initEvents() {
        this.inputFile.change(function(iface, event) {
            let file = this.files[0];
            file.arrayBuffer().then(buffer => {
                rom = new Rom(buffer);
                rom.name = file.name.basename();
                iface.setInputFile(rom.name);
                localStorage.setItem('rom_name', rom.name);
                localStorage.setItem('rom_data', rom);
            });
        }.bind(this.inputFile, this));

        this.seedButton.click(event => {
            this.seedEl.value = new String(
                Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
        });

        this.goButton.click(event => {
            let seed = BigInt(this.seedEl.value);
            let flags = this.flagsEl.value;
            let sprite = localStorage.sprite || 'Random';
            rom.randomize(seed, flags, sprite);
            rom.save();
        })
    }

    setFlags(flags) {
        this.flagsEl.value = flags;
        localStorage.setItem('flags', flags); 
        this.updateFlagBytes();
        this.updateInputs();
    }

    updateFlags() {
        this.flagBytes.fill(0);
        for (let i=0; i < this.inputs.length; i++) {
            let input = this.inputs[i];
            let bytepos = Number(input.dataset.bytepos)
            let shift =  Number(input.dataset.shift)
            this.flagBytes[bytepos] |= input.getValue() << shift;
        }
        let encoded = base32.encode(this.flagBytes);
        localStorage.setItem('flags', encoded); 
        this.flagsEl.value = encoded;
        return encoded;
    }

    updateFlagBytes() {
        let decoded = base32.decode(this.flagsEl.value);
        this.flagBytes.fill(0);
        for (let i=0; i < decoded.length; i++) {
            this.flagBytes[i] = decoded.charCodeAt(i);
        }
        return this.flagBytes;
    }

    updateInputs() {
        for (let i=0; i < this.inputs.length; i++) {
            let input = this.inputs[i];
            let bytepos = Number(input.dataset.bytepos)
            let shift =  Number(input.dataset.shift)
            let value = this.flagBytes[bytepos] >> shift;
            input.setValue(value);
        }
    }

    addTab(name) {
        let tab = document.createElement('tab');
        tab.innerText = name;
        tab.id = name + '-tab';
        tab.click(function(event) {
            ui.setActiveTab(this.innerText);
        });
        this.tabBar.append(tab);
        let content = document.createElement('tabcontent');
        content.id = name + '-flags'
        for (let i=0; i < 10; i++) {
            content.append(document.createElement('flagcontainer'))
        }
        this.tabContainer.append(content);
        this.tabs[name] = {
            'tab': tab,
            'content': content
        }
    }

    setVersion(version) {
        this.subHeader.innerText = 'Version ' + version;
    }

    setInputFile(name) {
        this.filenameSpan.innerText = name;
    }

    setActiveTab(name) {
        $$('tab').forEach(function(tab) { tab.classList.remove('active') });
        $$('tabcontent').hide();
        if (this.tabs[name]) {
            this.tabs[name].tab.classList.add('active');
            this.tabs[name].content.show();
        }

    }

    addTextBox(tab, position, title) {
        let input = this.create('input')
        input.name = tab + position;
        let label = this.create('label', title)
        label.for = tab + position;
        let container = this.tabs[tab].content.children[position];
        container.innerHTML = '';
        container.append(label);
        container.append(input);
        return input;
    }

    addDropDown(tab, position, bytepos, shift, title, values) {
        let select = this.create('select');
        select.dataset.bytepos = bytepos;
        select.dataset.shift = shift;
        for (let v in values) {
            let option = this.create('option', v);
            option.value = values[v];
            select.append(option);
        }
        select.change(this.updateFlags.bind(this));
        let container = this.tabs[tab].content.children[position];
        container.innerText = title;
        container.append(select);
        this.inputs.push(select);
        this.updateInputs();
        return select;
    }

    addOption(tab, position, bytepos, shift, title, skipChange) {
        let input = this.create('input')
        input.type = 'checkbox';
        input.name = tab + position;
        input.dataset.bytepos = bytepos;
        input.dataset.shift = shift;
        if (!skipChange)
            input.change(this.updateFlags.bind(this));
        let label = this.create('label', title)
        label.for = tab + position;
        let container = this.tabs[tab].content.children[position];
        container.innerHTML = '';
        label.prepend(input);
        container.append(label);
        this.inputs.push(input);
        this.updateInputs();
        return input;
    }

    addTriOption(tab, position, bytepos, shift , title) {
        let input = this.addOption(tab, position, bytepos, shift, title);
        input.triState();
        input.change(this.updateFlags.bind(this));
        this.updateInputs();
        return input;
    }
}
