FROM openhab/openhab:latest

RUN apt-get update \
 && apt-get install \
        --no-install-recommends \
        --fix-missing \
        --assume-yes \
            ssh \
            iputils-ping \
        && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*