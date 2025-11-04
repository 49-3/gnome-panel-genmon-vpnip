import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as Utils from './utils.js';

const DEBUG_LOG = false;

function debugLog(message) {
    if (DEBUG_LOG) {
        console.log(message);
    }
}

export const VPNIPAddressIndicator = GObject.registerClass(
    {
        GTypeName: 'VPNIPAddressIndicator',
    },
    class VPNIPAddressIndicator extends PanelMenu.Button {
        _init() {
            super._init(0, "VPN IP Address Indicator", false);

            this.box = new St.BoxLayout({
                vertical: false,
                style: 'padding-left: 5px; padding-right: 5px;'
            });

            this.defaultIcon = new St.Icon({
                icon_name: 'network-vpn-acquiring',
                icon_size: 16,
                style_class: 'system-status-icon'
            });

            this.vpnIcon = new St.Icon({
                icon_name: 'network-vpn',
                icon_size: 16,
                style_class: 'system-status-icon'
            });

            this.buttonText = new St.Label({
                text: 'No VPN IP',
                y_align: Clutter.ActorAlign.CENTER,
                style: 'padding-left: 5px; color: white;'
            });

            this.box.add_child(this.defaultIcon);
            this.add_child(this.box);

            // store last seen vpn ip so the click handler can copy it
            this._lastVpnIp = '';
            // connect once to avoid adding multiple handlers during updates
            this.connect('button-press-event', () => {
                if (this._lastVpnIp) {
                    St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, this._lastVpnIp);
                    debugLog(`Copied VPN IP to clipboard: ${this._lastVpnIp}`);
                }
            });

            debugLog("VPNIPAddressIndicator initialized.");
            this._updateLabel();
        }

        _updateLabel() {
            const priority = 0;
            const refreshTime = 5;

            if (this._timeout) {
                GLib.source_remove(this._timeout);
                this._timeout = undefined;
            }

            this._timeout = GLib.timeout_add_seconds(priority, refreshTime, async () => {
                try {
                    const vpnIp = await Utils.getVpnIp();
                    debugLog(`VPN Indicator says: ${vpnIp}`);

                    if (vpnIp) {
                        this.buttonText.set_text(vpnIp);
                        if (this.box.contains(this.defaultIcon)) {
                            this.box.remove_child(this.defaultIcon);
                        }
                        if (!this.box.contains(this.vpnIcon)) {
                            this.box.add_child(this.vpnIcon);
                        }
                        if (!this.box.contains(this.buttonText)) {
                            this.box.add_child(this.buttonText);
                        }
                        // save last ip so the single click handler can use it
                        this._lastVpnIp = vpnIp;
                    } else {
                        if (this.box.contains(this.buttonText)) {
                            this.box.remove_child(this.buttonText);
                        }
                        if (this.box.contains(this.vpnIcon)) {
                            this.box.remove_child(this.vpnIcon);
                        }
                        if (!this.box.contains(this.defaultIcon)) {
                            this.box.add_child(this.defaultIcon);
                        }
                    }
                } catch (error) {
                    debugLog(`Error updating VPN IP: ${error.message}`);
                }

                return GLib.SOURCE_CONTINUE;
            });
        }

        destroy() {
            if (this._timeout) {
                GLib.source_remove(this._timeout);
            }
            this._timeout = undefined;
            this.menu.removeAll();
            debugLog("VPNIPAddressIndicator stopped.");
            super.destroy();
        }
    }
);
