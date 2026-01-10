.PHONY: all
all:
	$(MAKE) -C conf-edit-ha build

%:
	$(MAKE) -C conf-edit-ha $@
